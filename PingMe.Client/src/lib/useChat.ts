import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type {
  AuthResult,
  ChatMessage,
  DirectChat,
  Group,
} from "./api";
import { ChatHub } from "./hub";
import type { ConnStatus } from "./hub";
import {
  decryptMessage,
  encryptMessage,
  getPublicKeyFromPrivateKey,
  initSodium,
  decryptGroupMessage,
  encryptGroupMessage,
} from "./crypto";
import { getPublicKey } from "./keyBundleCache";

export type { AuthResult, ChatMessage, DirectChat, Group, ConnStatus };

export type ActiveChat =
  | { kind: "dm"; chat: DirectChat }
  | { kind: "group"; chat: Group }
  | null;

const AUTH_KEY = "pingme.auth";
const AUTH_EMAIL_KEY = "pingme.auth.email";
const AUTH_PRIVKEY_KEY = "pingme.auth.privkey";

export function isJwtExpired(token?: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export function loadStoredAuth(): AuthResult | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw) as AuthResult;
    const token = auth.accessToken || auth.token;
    if (isJwtExpired(token)) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_PRIVKEY_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

export function storeAuthEmail(email: string): void {
  if (email) localStorage.setItem(AUTH_EMAIL_KEY, email.trim().toLowerCase());
}

export function loadStoredEmail(): string | null {
  return localStorage.getItem(AUTH_EMAIL_KEY);
}

export function loadStoredPrivateKey(): string | null {
  return localStorage.getItem(AUTH_PRIVKEY_KEY);
}

export function storePrivateKey(key: string | null): void {
  if (key) {
    localStorage.setItem(AUTH_PRIVKEY_KEY, key);
  } else {
    localStorage.removeItem(AUTH_PRIVKEY_KEY);
  }
}

export function storeAuth(auth: AuthResult | null) {
  if (auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EMAIL_KEY);
    localStorage.removeItem(AUTH_PRIVKEY_KEY);
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useChat(
  auth: AuthResult | null,
  myPrivateKey: string | null,
  activeOrgId: string | null,
  onNotificationToast?: (msg: string) => void,
) {
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeChat, setActiveChatState] = useState<ActiveChat>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [hasMoreOlder, setHasMoreOlder] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const messagesRef = useRef<Record<string, ChatMessage[]>>({});
  messagesRef.current = messages;
  const [connStatus, setConnStatus] = useState<ConnStatus>("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const hubRef = useRef<ChatHub | null>(null);
  const [hubInstance, setHubInstance] = useState<ChatHub | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const onNotificationToastRef = useRef(onNotificationToast);
  onNotificationToastRef.current = onNotificationToast;

  const token = auth?.accessToken ?? null;
  const userId = auth?.userId ?? null;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getParticipantIds = useCallback((chat: ActiveChat): string[] => {
    if (!chat) return [];
    if (chat.kind === "dm") return [chat.chat.otherUserId, userId ?? ""].filter(Boolean);
    return chat.chat.members.map((m) => m.userId);
  }, [userId]);

  // ── Decrypt helper ────────────────────────────────────────────────────────────

  const decryptAnyMessage = useCallback(
    async (msg: ChatMessage, participantIds?: string[]): Promise<string> => {
      if (msg.isDeleted) {
        return "This message was deleted";
      }

      // Call logs are not end-to-end encrypted; return metadata directly
      if (msg.type === "call") {
        return msg.content || msg.ciphertext || "";
      }

      if (!token || !myPrivateKey || !userId) return msg.content || "[Unable to decrypt]";

      await initSodium();

      // 1. If group chat, decrypt symmetrically using group ID as key
      if (msg.chatType === "group" && msg.ciphertext && msg.nonce) {
        try {
          return decryptGroupMessage(msg.ciphertext, msg.nonce, msg.chatId);
        } catch (err) {
          console.warn(`Failed to decrypt group message ${msg.id} symmetrically:`, err);
        }
      }

      const isMe = msg.senderId?.toLowerCase() === userId.toLowerCase();

      // 2. Try self-decryption for my own sent messages
      if (isMe && msg.selfCiphertext && msg.selfNonce) {
        try {
          const myPublicKey = getPublicKeyFromPrivateKey(myPrivateKey);
          return decryptMessage(msg.selfCiphertext, msg.selfNonce, myPublicKey, myPrivateKey);
        } catch (e) {
          console.warn("Self-decrypt failed:", e);
        }
      }

      // 3. For DM messages, resolve the other peer's userId
      const peerId = !isMe
        ? msg.senderId
        : participantIds?.find((id) => id.toLowerCase() !== userId.toLowerCase());

      if (peerId && msg.ciphertext && msg.nonce) {
        // Try cached key first
        try {
          const peerKey = await getPublicKey(token, peerId, false);
          return decryptMessage(msg.ciphertext, msg.nonce, peerKey, myPrivateKey);
        } catch {
          // If failed, force refresh the peer public key from backend in case it changed
          try {
            const freshPeerKey = await getPublicKey(token, peerId, true);
            return decryptMessage(msg.ciphertext, msg.nonce, freshPeerKey, myPrivateKey);
          } catch (retryErr) {
            console.warn(`Retry decrypt message ${msg.id} with peer ${peerId} failed:`, retryErr);
          }
        }
      }

      // 4. Try symmetric fallback with chatId
      if (msg.ciphertext && msg.nonce) {
        try {
          return decryptGroupMessage(msg.ciphertext, msg.nonce, msg.chatId);
        } catch {
          // Ignore
        }
      }

      // 5. Try selfCiphertext with my own private key
      if (msg.selfCiphertext && msg.selfNonce) {
        try {
          const myPublicKey = getPublicKeyFromPrivateKey(myPrivateKey);
          return decryptMessage(msg.selfCiphertext, msg.selfNonce, myPublicKey, myPrivateKey);
        } catch {
          // Ignore
        }
      }

      return "[Unable to decrypt]";
    },
    [token, myPrivateKey, userId],
  );

  // ── Load org chats ────────────────────────────────────────────────────────────

  const loadOrgChats = useCallback(async () => {
    if (!token || !activeOrgId) return;
    try {
      const [dms, grps] = await Promise.all([
        api.directChats.list(token, activeOrgId),
        api.groups.list(token, activeOrgId),
      ]);
      setDirectChats(dms);
      setGroups(grps);
    } catch (err) {
      console.warn("loadOrgChats failed:", err);
    }
  }, [token, activeOrgId]);

  // ── Load message history ──────────────────────────────────────────────────────

  const loadHistory = useCallback(
    async (chat: ActiveChat) => {
      if (!token || !myPrivateKey || !userId || !chat || !activeOrgId) return;

      try {
        await initSodium();

        const data =
          chat.kind === "dm"
            ? await api.directChats.loadHistory(token, activeOrgId, chat.chat.id)
            : await api.groups.loadHistory(token, activeOrgId, chat.chat.id);

        const participantIds = getParticipantIds(chat);

        const decrypted = await Promise.all(
          data.map(async (msg) => ({
            ...msg,
            content: await decryptAnyMessage(msg, participantIds),
          })),
        );

        setMessages((prev) => ({ ...prev, [chat.chat.id]: decrypted }));
        setHasMoreOlder((prev) => ({ ...prev, [chat.chat.id]: data.length >= 50 }));
      } catch (err) {
        console.warn("loadHistory failed:", err);
      }
    },
    [token, myPrivateKey, userId, activeOrgId, decryptAnyMessage, getParticipantIds],
  );

  const loadOlderHistory = useCallback(
    async (targetChat?: ActiveChat): Promise<boolean> => {
      const chat = targetChat || activeChat;
      if (!token || !myPrivateKey || !userId || !chat || !activeOrgId || loadingOlderRef.current) return false;

      const chatId = chat.chat.id;
      const currentList = messagesRef.current[chatId] || [];
      const oldestMsg = currentList[0];
      if (!oldestMsg?.sentAt) return false;

      loadingOlderRef.current = true;
      setLoadingOlder(true);

      try {
        await initSodium();

        const data =
          chat.kind === "dm"
            ? await api.directChats.loadHistory(token, activeOrgId, chatId, 50, oldestMsg.sentAt)
            : await api.groups.loadHistory(token, activeOrgId, chatId, 50, oldestMsg.sentAt);

        if (data.length === 0) {
          setHasMoreOlder((prev) => ({ ...prev, [chatId]: false }));
          return false;
        }

        const participantIds = getParticipantIds(chat);
        const decrypted = await Promise.all(
          data.map(async (msg) => ({
            ...msg,
            content: await decryptAnyMessage(msg, participantIds),
          })),
        );

        setMessages((prev) => {
          const prevList = prev[chatId] || [];
          const prevIds = new Set(prevList.map((m) => m.id));
          const uniqueOlder = decrypted.filter((m) => !prevIds.has(m.id));
          return { ...prev, [chatId]: [...uniqueOlder, ...prevList] };
        });

        const hasMore = data.length >= 50;
        setHasMoreOlder((prev) => ({ ...prev, [chatId]: hasMore }));
        return true;
      } catch (err) {
        console.warn("loadOlderHistory failed:", err);
        return false;
      } finally {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    },
    [token, myPrivateKey, userId, activeOrgId, activeChat, decryptAnyMessage, getParticipantIds],
  );

  // ── SignalR setup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!auth || !myPrivateKey || !userId) return;

    loadOrgChats();

    // Load unread counts
    api.getUnreadCounts(auth.accessToken)
      .then((counts) => {
        if (Array.isArray(counts)) {
          setUnreadCounts(Object.fromEntries(counts.map((c) => [c.conversationId, c.count])));
        }
      })
      .catch((err) => console.warn("getUnreadCounts failed:", err));

    const hub = new ChatHub(auth.accessToken);
    hubRef.current = hub;
    setHubInstance(hub);  // triggers re-render so useCall sees the hub

    const unsub = hub.onStatusChange(setConnStatus);

    // ReceiveNotification
    hub.on("ReceiveNotification", (raw: unknown) => {
      const notif = raw as { conversationId: string; senderId: string };
      if (!notif?.conversationId) return;
      if (notif.conversationId === activeChatRef.current) return;
      setUnreadCounts((prev) => ({
        ...prev,
        [notif.conversationId]: (prev[notif.conversationId] ?? 0) + 1,
      }));
    });

    // ReceiveMessage
    hub.on("ReceiveMessage", async (raw: unknown) => {
      const msg = raw as ChatMessage;

      // Get participant IDs from known state
      const knownDm = directChats.find((d) => d.id === msg.chatId);
      const knownGroup = groups.find((g) => g.id === msg.chatId);
      const participantIds = knownDm
        ? [knownDm.otherUserId, userId]
        : knownGroup?.members.map((m) => m.userId);

      const content = await decryptAnyMessage(msg, participantIds);
      const decrypted: ChatMessage = { ...msg, content, _temp: false };

      const isFromPeer = decrypted.senderId?.toLowerCase() !== userId?.toLowerCase();
      if (isFromPeer && decrypted.chatId !== activeChatRef.current) {
        let preview = "New message received";
        if (decrypted.type === "call") {
          try {
            const data = JSON.parse(decrypted.content || "{}");
            preview = data.status === "missed" ? `Missed ${data.callType || "voice"} call` : `${data.callType || "Voice"} call ended`;
          } catch {
            preview = "Call";
          }
        } else if (decrypted.content && decrypted.content !== "[Unable to decrypt]") {
          preview = decrypted.content;
        }
        const sender = decrypted.senderName || "Someone";
        onNotificationToastRef.current?.(`${sender}: ${preview}`);
      }

      setMessages((prev) => {
        const list = prev[decrypted.chatId] ?? [];

        if (list.some((m) => m.id === decrypted.id)) return prev;

        // Replace optimistic temp message
        if (decrypted.senderId?.toLowerCase() === userId?.toLowerCase()) {
          const tempIndex = list.findIndex(
            (m) =>
              m._temp &&
              ((m.ciphertext === decrypted.ciphertext && m.nonce === decrypted.nonce) ||
                (m.selfCiphertext && m.selfCiphertext === decrypted.selfCiphertext)),
          );
          if (tempIndex >= 0) {
            const existingTemp = list[tempIndex];
            if (decrypted.content === "[Unable to decrypt]" && existingTemp.content) {
              decrypted.content = existingTemp.content;
            }
            const updated = [...list];
            updated[tempIndex] = decrypted;
            return { ...prev, [decrypted.chatId]: updated };
          }
        }

        return { ...prev, [decrypted.chatId]: [...list, decrypted] };
      });

      // Update DM preview
      setDirectChats((prev) =>
        prev
          .map((d) =>
            d.id === decrypted.chatId
              ? { ...d, updatedAt: decrypted.sentAt, lastPreview: decrypted.content }
              : d,
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );

      // Update Group preview
      setGroups((prev) =>
        prev
          .map((g) =>
            g.id === decrypted.chatId
              ? { ...g, updatedAt: decrypted.sentAt, lastPreview: decrypted.content }
              : g,
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    });

    // MessageEdited
    hub.on("MessageEdited", async (raw: unknown) => {
      const payload = raw as {
        messageId: string;
        chatId: string;
        ciphertext: string;
        nonce: string;
        selfCiphertext?: string;
        selfNonce?: string;
        isEdited: boolean;
        editedAt: string;
      };

      const knownDm = directChats.find((d) => d.id === payload.chatId);
      const knownGroup = groups.find((g) => g.id === payload.chatId);
      const participantIds = knownDm
        ? [knownDm.otherUserId, userId]
        : knownGroup?.members.map((m) => m.userId);

      const fakeMsg: ChatMessage = {
        id: payload.messageId,
        organizationId: activeOrgId || "",
        chatId: payload.chatId,
        chatType: knownDm ? "dm" : "group",
        senderId: "",
        ciphertext: payload.ciphertext,
        nonce: payload.nonce,
        selfCiphertext: payload.selfCiphertext,
        selfNonce: payload.selfNonce,
        status: "sent",
        sentAt: "",
        type: "text",
      };

      const newContent = await decryptAnyMessage(fakeMsg, participantIds);

      setMessages((prev) => {
        const list = prev[payload.chatId];
        if (!list) return prev;
        return {
          ...prev,
          [payload.chatId]: list.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  ciphertext: payload.ciphertext,
                  nonce: payload.nonce,
                  selfCiphertext: payload.selfCiphertext,
                  selfNonce: payload.selfNonce,
                  content: newContent,
                  isEdited: true,
                  editedAt: payload.editedAt,
                }
              : m,
          ),
        };
      });
    });

    // MessageDeleted
    hub.on("MessageDeleted", (raw: unknown) => {
      const payload = raw as {
        messageId: string;
        chatId: string;
        deleteForEveryone: boolean;
        userId?: string;
      };

      setMessages((prev) => {
        const list = prev[payload.chatId];
        if (!list) return prev;

        if (payload.deleteForEveryone) {
          return {
            ...prev,
            [payload.chatId]: list.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    isDeleted: true,
                    content: "This message was deleted",
                    fileUrl: undefined,
                    fileName: undefined,
                  }
                : m,
            ),
          };
        } else {
          return {
            ...prev,
            [payload.chatId]: list.filter((m) => m.id !== payload.messageId),
          };
        }
      });
    });

    // MessageReactionUpdated
    hub.on("MessageReactionUpdated", (raw: unknown) => {
      const payload = raw as {
        messageId: string;
        chatId: string;
        reactions: Record<string, string[]>;
      };

      setMessages((prev) => {
        const list = prev[payload.chatId];
        if (!list) return prev;
        return {
          ...prev,
          [payload.chatId]: list.map((m) =>
            m.id === payload.messageId
              ? { ...m, reactions: payload.reactions }
              : m,
          ),
        };
      });
    });

    // Presence
    hub.on("UserOnline", (raw: unknown) => {
      setOnlineUsers((prev) => new Set([...prev, raw as string]));
    });
    hub.on("UserOffline", (raw: unknown) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(raw as string);
        return next;
      });
    });
    hub.on("OnlineUsers", (users: unknown) => {
      setOnlineUsers(new Set(users as string[]));
    });

    // Typing
    hub.on("UserTyping", (userRaw: unknown, convRaw: unknown) => {
      const uid = userRaw as string;
      const cid = convRaw as string;
      if (uid === userId) return;
      setTypingUsers((prev) => ({ ...prev, [cid]: new Set([...(prev[cid] ?? []), uid]) }));
    });
    hub.on("UserStoppedTyping", (userRaw: unknown, convRaw: unknown) => {
      const uid = userRaw as string;
      const cid = convRaw as string;
      setTypingUsers((prev) => {
        const next = new Set(prev[cid] ?? []);
        next.delete(uid);
        return { ...prev, [cid]: next };
      });
    });

    hub.start().catch((err) => console.warn("Hub start failed:", err));

    return () => {
      unsub();
      void hub.stop();
      hubRef.current = null;
    };
  }, [auth, userId, myPrivateKey, loadOrgChats]);

  // When org changes, reset chat state and reload
  useEffect(() => {
    setActiveChat(null);
    setMessages({});
    setUnreadCounts({});
    setDirectChats([]);
    setGroups([]);
    if (activeOrgId) loadOrgChats();
  }, [activeOrgId]);

  // ── Open chat ─────────────────────────────────────────────────────────────────

  function setActiveChat(chat: ActiveChat) {
    setActiveChatState(chat);
    activeChatRef.current = chat?.chat.id ?? null;
  }

  const openChat = useCallback(
    async (chat: ActiveChat) => {
      if (!chat) {
        setActiveChat(null);
        return;
      }

      setActiveChat(chat);

      const chatId = chat.chat.id;

      // Clear unread badge
      if (unreadCounts[chatId]) {
        setUnreadCounts((prev) => {
          const next = { ...prev };
          delete next[chatId];
          return next;
        });
        if (token) {
          api.markChatRead(token, chatId).catch(() => {});
        }
      }

      // Prefetch public keys for DMs
      if (token && chat.kind === "dm") {
        const otherId = chat.chat.otherUserId;
        if (otherId && otherId.toLowerCase() !== userId?.toLowerCase()) {
          getPublicKey(token, otherId).catch(() => {});
        }
      }

      // Join SignalR group
      if (activeOrgId) {
        hubRef.current?.invoke("JoinChat", activeOrgId, chatId, chat.kind === "dm" ? "dm" : "group");
      }

      await loadHistory(chat);
    },
    [token, userId, activeOrgId, unreadCounts, loadHistory],
  );

  // ── Start DM ──────────────────────────────────────────────────────────────────

  const openOrCreateDm = useCallback(
    async (targetUserId: string) => {
      if (!token || !activeOrgId) return;

      // Check if DM already exists
      const existing = directChats.find((d) => d.otherUserId === targetUserId);
      if (existing) {
        await openChat({ kind: "dm", chat: existing });
        return;
      }

      try {
        const dm = await api.directChats.getOrCreate(token, activeOrgId, targetUserId);
        setDirectChats((prev) => [dm, ...prev.filter((d) => d.id !== dm.id)]);
        await openChat({ kind: "dm", chat: dm });
      } catch (err) {
        console.warn("openOrCreateDm failed:", err);
        throw err;
      }
    },
    [token, activeOrgId, directChats, openChat],
  );

  // ── Create group ──────────────────────────────────────────────────────────────

  const createGroup = useCallback(
    async (name: string, memberUserIds: string[], description?: string) => {
      if (!token || !activeOrgId) return null;
      const group = await api.groups.create(token, activeOrgId, {
        name,
        description,
        memberUserIds,
      });
      setGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
      await openChat({ kind: "group", chat: group });
      return group;
    },
    [token, activeOrgId, openChat],
  );

  // ── Send message ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      const chat = activeChat;
      const hub = hubRef.current;

      if (!chat || !userId || !token || !myPrivateKey || !hub?.isConnected || !activeOrgId || !content.trim()) {
        return;
      }

      const chatId = chat.chat.id;

      try {
        let encrypted;
        if (chat.kind === "group") {
          encrypted = encryptGroupMessage(content.trim(), chatId);
        } else {
          const participantIds = getParticipantIds(chat);
          const recipientId = participantIds.find((id) => id !== userId);
          if (!recipientId) {
            console.warn("No recipient found for chat", chatId);
            return;
          }
          const peerKey = await getPublicKey(token, recipientId);
          const myPublicKey = getPublicKeyFromPrivateKey(myPrivateKey);
          encrypted = encryptMessage(content.trim(), peerKey, myPublicKey, myPrivateKey);
        }

        const tempMsg: ChatMessage = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          organizationId: activeOrgId,
          chatId,
          chatType: chat.kind === "dm" ? "dm" : "group",
          senderId: userId,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          selfCiphertext: encrypted.selfCiphertext,
          selfNonce: encrypted.selfNonce,
          content: content.trim(),
          type: "text",
          status: "sent",
          sentAt: new Date().toISOString(),
          _temp: true,
        };

        setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), tempMsg] }));

        await hub.invoke("SendMessage", {
          organizationId: activeOrgId,
          chatId,
          chatType: chat.kind === "dm" ? "dm" : "group",
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          selfCiphertext: encrypted.selfCiphertext,
          selfNonce: encrypted.selfNonce,
          type: "text",
        });

        await hub.invoke("StopTyping", activeOrgId, chatId);
      } catch (err) {
        console.warn("Send failed:", err);
      }
    },
    [activeChat, userId, token, myPrivateKey, activeOrgId, getParticipantIds],
  );

  // ── Send call record ─────────────────────────────────────────────────────────

  const sendCallRecord = useCallback(
    async (
      chatId: string,
      callType: "audio" | "video",
      status: "completed" | "missed" | "declined" | "busy",
      duration: number,
    ) => {
      const hub = hubRef.current;
      if (!hub?.isConnected || !activeOrgId || !userId) {
        console.warn("[useChat] Cannot send call record: missing connection or org/user context");
        return;
      }

      const payload = JSON.stringify({ callType, status, duration });

      try {
        await hub.invoke("SendMessage", {
          organizationId: activeOrgId,
          chatId,
          chatType: "dm",
          ciphertext: payload,
          nonce: "call",
          type: "call",
        });
        console.log("[useChat] Sent call record:", { chatId, callType, status, duration });
      } catch (err) {
        console.warn("Failed to send call record:", err);
      }
    },
    [activeOrgId, userId],
  );

  // ── Edit message ─────────────────────────────────────────────────────────────

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const chat = activeChat;
      const hub = hubRef.current;
      if (!chat || !userId || !token || !myPrivateKey || !hub?.isConnected || !activeOrgId || !newContent.trim()) {
        return;
      }

      const chatId = chat.chat.id;

      try {
        let encrypted;
        if (chat.kind === "group") {
          encrypted = encryptGroupMessage(newContent.trim(), chatId);
        } else {
          const participantIds = getParticipantIds(chat);
          const recipientId = participantIds.find((id) => id !== userId);
          if (!recipientId) return;
          const peerKey = await getPublicKey(token, recipientId);
          const myPublicKey = getPublicKeyFromPrivateKey(myPrivateKey);
          encrypted = encryptMessage(newContent.trim(), peerKey, myPublicKey, myPrivateKey);
        }

        // Optimistic update
        setMessages((prev) => {
          const list = prev[chatId];
          if (!list) return prev;
          return {
            ...prev,
            [chatId]: list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    content: newContent.trim(),
                    isEdited: true,
                    editedAt: new Date().toISOString(),
                  }
                : m,
            ),
          };
        });

        await hub.invoke("EditMessage", {
          organizationId: activeOrgId,
          chatId,
          messageId,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          selfCiphertext: encrypted.selfCiphertext,
          selfNonce: encrypted.selfNonce,
        });
      } catch (err) {
        console.warn("Edit failed:", err);
      }
    },
    [activeChat, userId, token, myPrivateKey, activeOrgId, getParticipantIds],
  );

  // ── Delete message ───────────────────────────────────────────────────────────

  const deleteMessage = useCallback(
    async (messageId: string, deleteForEveryone: boolean) => {
      const chat = activeChat;
      const hub = hubRef.current;
      if (!chat || !hub?.isConnected || !activeOrgId) return;

      const chatId = chat.chat.id;

      // Optimistic update
      setMessages((prev) => {
        const list = prev[chatId];
        if (!list) return prev;
        if (deleteForEveryone) {
          return {
            ...prev,
            [chatId]: list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    content: "This message was deleted",
                    fileUrl: undefined,
                    fileName: undefined,
                  }
                : m,
            ),
          };
        } else {
          return {
            ...prev,
            [chatId]: list.filter((m) => m.id !== messageId),
          };
        }
      });

      try {
        await hub.invoke("DeleteMessage", {
          organizationId: activeOrgId,
          chatId,
          messageId,
          deleteForEveryone,
        });
      } catch (err) {
        console.warn("Delete failed:", err);
      }
    },
    [activeChat, activeOrgId],
  );

  // ── React to message ─────────────────────────────────────────────────────────

  const reactToMessage = useCallback(
    async (messageId: string, emoji: string) => {
      const chat = activeChat;
      const hub = hubRef.current;
      if (!chat || !hub?.isConnected || !activeOrgId || !userId) return;

      const chatId = chat.chat.id;

      // Optimistic toggle
      setMessages((prev) => {
        const list = prev[chatId];
        if (!list) return prev;
        return {
          ...prev,
          [chatId]: list.map((m) => {
            if (m.id !== messageId) return m;
            const curReactions: Record<string, string[]> = {};
            if (m.reactions) {
              for (const [k, v] of Object.entries(m.reactions)) {
                curReactions[k] = [...v];
              }
            }
            const users = [...(curReactions[emoji] || [])];
            if (users.includes(userId)) {
              const filtered = users.filter((u) => u !== userId);
              if (filtered.length === 0) {
                delete curReactions[emoji];
              } else {
                curReactions[emoji] = filtered;
              }
            } else {
              curReactions[emoji] = [...users, userId];
            }
            return { ...m, reactions: curReactions };
          }),
        };
      });

      try {
        await hub.invoke("ReactToMessage", {
          organizationId: activeOrgId,
          chatId,
          messageId,
          emoji,
        });
      } catch (err) {
        console.warn("React failed:", err);
      }
    },
    [activeChat, activeOrgId, userId],
  );

  // ── Send file ─────────────────────────────────────────────────────────────────

  const sendFile = useCallback(
    async (file: File, caption: string = "") => {
      const chat = activeChat;
      const hub = hubRef.current;
      if (!chat || !userId || !token || !myPrivateKey || !hub?.isConnected || !activeOrgId) {
        throw new Error("Not ready to send");
      }

      const chatId = chat.chat.id;
      const uploaded = await api.uploadFile(token, file);

      const fileMessageType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type === "application/pdf"
            ? "pdf"
            : "file";

      let encrypted;
      if (chat.kind === "group") {
        encrypted = encryptGroupMessage(caption, chatId);
      } else {
        const participantIds = getParticipantIds(chat);
        const recipientId = participantIds.find((id) => id !== userId);
        if (!recipientId) throw new Error("No recipient found for this chat");
        const peerKey = await getPublicKey(token, recipientId);
        const myPublicKey = getPublicKeyFromPrivateKey(myPrivateKey);
        encrypted = encryptMessage(caption, peerKey, myPublicKey, myPrivateKey);
      }

      const tempMsg: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        organizationId: activeOrgId,
        chatId,
        chatType: chat.kind === "dm" ? "dm" : "group",
        senderId: userId,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        selfCiphertext: encrypted.selfCiphertext,
        selfNonce: encrypted.selfNonce,
        content: caption,
        type: fileMessageType,
        status: "sent",
        sentAt: new Date().toISOString(),
        _temp: true,
        fileUrl: uploaded.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      setMessages((prev) => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), tempMsg] }));

      await hub.invoke("SendMessage", {
        organizationId: activeOrgId,
        chatId,
        chatType: chat.kind === "dm" ? "dm" : "group",
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        selfCiphertext: encrypted.selfCiphertext,
        selfNonce: encrypted.selfNonce,
        type: fileMessageType,
        fileUrl: uploaded.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
    },
    [activeChat, userId, token, myPrivateKey, activeOrgId, getParticipantIds],
  );

  // ── Typing ────────────────────────────────────────────────────────────────────

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!activeChat || !activeOrgId) return;
      hubRef.current?.invoke(
        typing ? "StartTyping" : "StopTyping",
        activeOrgId,
        activeChat.chat.id,
      );
    },
    [activeChat, activeOrgId],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setActiveChat(null);
    setDirectChats([]);
    setGroups([]);
    setMessages({});
    setOnlineUsers(new Set());
    setTypingUsers({});
    setUnreadCounts({});
    setConnStatus("disconnected");
  }, []);

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    hub: hubInstance,
    directChats,
    groups,
    activeChat,
    messages,
    hasMoreOlder: Boolean(activeChat && hasMoreOlder[activeChat.chat.id]),
    loadingOlder,
    loadOlderHistory,
    connStatus,
    onlineUsers,
    typingUsers,
    unreadCounts,
    openChat,
    openOrCreateDm,
    createGroup,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    sendCallRecord,
    sendFile,
    sendTyping,
    loadOrgChats,
    reset,
  };
}