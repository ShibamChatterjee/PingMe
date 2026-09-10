import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { ChatMessage, MemberResponseDto } from "../lib/api";
import type { ActiveChat } from "../lib/useChat";
import type { ConnStatus } from "../lib/hub";
import { fmtDate, fmtTime } from "../lib/utils";
import { Avatar } from "./Avatar";
import { ChatHeader } from "./ChatHeader";
import { ExcalidrawView } from "./ExcalidrawView";
import { EmojiPicker, QUICK_REACTIONS } from "./EmojiPicker";
import { FormattedMessage } from "./FormattedMessage";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Paper,
  Tooltip,
  Popover,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallIcon from "@mui/icons-material/Call";
import CallMissedIcon from "@mui/icons-material/CallMissed";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import CheckIcon from "@mui/icons-material/Check";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import BrushIcon from "@mui/icons-material/Brush";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import CodeIcon from "@mui/icons-material/Code";
import DataObjectIcon from "@mui/icons-material/DataObject";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddReactionIcon from "@mui/icons-material/AddReaction";
import BlockIcon from "@mui/icons-material/Block";

const TextFieldAny = TextField as any;

interface Props {
  activeChat: ActiveChat;
  messages: ChatMessage[];
  userId: string;
  username: string;
  members: MemberResponseDto[];
  connStatus: ConnStatus;
  typingUserIds: string[];
  onlineUsers: Set<string>;
  onSend: (content: string) => void;
  onSendFile: (file: File, caption: string) => void;
  onTyping: (typing: boolean) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string, deleteForEveryone: boolean) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onOpenProfile?: (userId: string) => void;
  onStartCall?: (type: "audio" | "video") => void;
  onStartScreenShare?: () => void;
  callActive?: boolean;
  onOpenTicket?: (ticketNumber: string) => void;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onBack?: () => void;
}

type GroupItem =
  | { kind: "date"; label: string; key: string }
  | { kind: "msg"; msg: ChatMessage; key: string };

const MAX_SIZE_MB = 25;
const ACCEPT_IMAGES = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPT_VIDEOS = "video/mp4,video/webm,video/quicktime";
const ACCEPT_PDF = "application/pdf";
const ACCEPT_DOCS = ".doc,.docx,.txt,.xls,.xlsx,.csv,.pptx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatView({
  activeChat,
  messages,
  userId,
  username,
  members,
  connStatus,
  typingUserIds,
  onlineUsers,
  onSend,
  onSendFile,
  onTyping,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onOpenProfile,
  onStartCall,
  onStartScreenShare,
  callActive = false,
  onOpenTicket,
  hasMoreOlder = false,
  loadingOlder = false,
  onLoadOlder,
  onBack,
}: Props) {
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<HTMLElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Map of userId -> display name & avatarUrl
  const memberMap = useMemo(() => {
    const map: Record<string, { username: string; avatarUrl?: string }> = {};
    for (const m of members) {
      if (m.userId) {
        map[m.userId.toLowerCase()] = { username: m.username, avatarUrl: m.avatarUrl };
      }
    }
    if (userId) {
      map[userId.toLowerCase()] = { username, avatarUrl: members.find((m) => m.userId === userId)?.avatarUrl };
    }
    return map;
  }, [members, userId, username]);

  const resolveSender = (senderId: string, fallbackName?: string) => {
    const found = memberMap[senderId?.toLowerCase()];
    return {
      name: found?.username || fallbackName || senderId || "Unknown",
      avatarUrl: found?.avatarUrl,
    };
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevActiveChatIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const prevFirstMsgIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingOlderRef = useRef(false);

  useEffect(() => {
    const currentChatId = activeChat ? activeChat.chat.id : null;
    const isChatSwitched = currentChatId !== prevActiveChatIdRef.current;
    prevActiveChatIdRef.current = currentChatId;

    if (isChatSwitched) {
      prevMessagesLengthRef.current = messages.length;
      prevFirstMsgIdRef.current = messages[0]?.id ?? null;
      isPrependingOlderRef.current = false;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return;
    }

    if (isPrependingOlderRef.current && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const newScrollHeight = el.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
      el.scrollTop += heightDiff;
      isPrependingOlderRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      prevFirstMsgIdRef.current = messages[0]?.id ?? null;
      return;
    }

    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    prevMessagesLengthRef.current = messages.length;
    prevFirstMsgIdRef.current = messages[0]?.id ?? null;
  }, [messages, activeChat]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || loadingOlder || !hasMoreOlder || !onLoadOlder) return;

    if (el.scrollTop < 80) {
      isPrependingOlderRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadOlder();
    }
  }, [loadingOlder, hasMoreOlder, onLoadOlder]);

  const inputElRef = useRef<HTMLTextAreaElement | null>(null);

  // Stable callback ref — ensures we always get the underlying <textarea> from MUI's multiline TextField
  const inputRefCallback = useCallback((el: HTMLTextAreaElement | HTMLInputElement | null) => {
    inputElRef.current = el as HTMLTextAreaElement | null;
  }, []);

  const applyFormat = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = "") => {
    const el = inputElRef.current;
    if (!el) {
      setInput((prev) => prev + prefix + defaultPlaceholder + suffix);
      return;
    }

    // Read selection immediately before any state updates
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const currentValue = el.value;  // read from DOM, not stale state
    const selected = currentValue.substring(start, end);
    const textToWrap = selected || defaultPlaceholder;
    const replacement = `${prefix}${textToWrap}${suffix}`;
    const nextVal = currentValue.substring(0, start) + replacement + currentValue.substring(end);

    setInput(nextVal);

    // Restore cursor after React re-render
    const newCursorStart = start + prefix.length;
    const newCursorEnd = selected ? end + prefix.length : newCursorStart + defaultPlaceholder.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  const insertLinePrefix = (linePrefix: string) => {
    const el = inputElRef.current;
    if (!el) {
      setInput((prev) => (prev ? prev + "\n" + linePrefix : linePrefix));
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const currentValue = el.value;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(start);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const insertion = (needsNewline ? "\n" : "") + linePrefix;

    setInput(before + insertion + after);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setInput(e.target.value);
    if (onTyping) {
      onTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === "x") {
        e.preventDefault();
        setShowFormatBar((prev) => !prev);
        return;
      }
      if (k === "b") {
        e.preventDefault();
        setShowFormatBar(true);
        applyFormat("**", "**", "bold text");
      } else if (k === "i") {
        e.preventDefault();
        setShowFormatBar(true);
        applyFormat("*", "*", "italic text");
      } else if (k === "e") {
        e.preventDefault();
        setShowFormatBar(true);
        applyFormat("`", "`", "code");
      } else if (k === "k") {
        e.preventDefault();
        setShowFormatBar(true);
        applyFormat("[", "](https://)", "link title");
      }
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || connStatus !== "connected") return;
    onSend(text);
    setInput("");
    if (onTyping) {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      onTyping(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File exceeds maximum size of ${MAX_SIZE_MB}MB`);
      return;
    }
    setFileError(null);
    setPendingFile(f);
    e.target.value = "";
  };

  const sendFile = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await onSendFile(pendingFile, caption.trim());
      setPendingFile(null);
      setCaption("");
    } catch {
      setFileError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const cancelFile = () => {
    setPendingFile(null);
    setCaption("");
    setFileError(null);
  };

  // Group messages by date
  const groupedItems = useMemo<GroupItem[]>(() => {
    const items: GroupItem[] = [];
    let lastDate = "";

    for (const msg of messages) {
      const d = fmtDate(msg.sentAt);
      if (d !== lastDate) {
        items.push({ kind: "date", label: d, key: `date-${d}` });
        lastDate = d;
      }
      items.push({ kind: "msg", msg, key: msg.id || `msg-${msg.sentAt}` });
    }
    return items;
  }, [messages]);

  const previewUrl = useMemo(() => {
    if (pendingFile && pendingFile.type.startsWith("image/")) {
      return URL.createObjectURL(pendingFile);
    }
    return null;
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const chatDisplayName = useMemo(() => {
    if (!activeChat) return "chat";
    if (activeChat.kind === "group") return `#${(activeChat.chat as any).name || "channel"}`;
    return `@${(activeChat.chat as any).otherUsername || "direct-message"}`;
  }, [activeChat]);

  // When Whiteboard Canvas is activated, render Excalidraw directly in-place replacing ChatView
  if (canvasOpen) {
    return (
      <ExcalidrawView
        chatDisplayName={chatDisplayName}
        onClose={() => setCanvasOpen(false)}
        onSend={(file, cap) => {
          onSendFile(file, cap);
          setCanvasOpen(false);
        }}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, height: "100%", overflow: "hidden", bgcolor: "background.default" }}>
      {/* Header */}
      <ChatHeader
        activeChat={activeChat}
        typingUserIds={typingUserIds}
        onlineUsers={onlineUsers}
        connStatus={connStatus}
        members={members}
        onOpenProfile={onOpenProfile}
        onStartCall={onStartCall}
        onStartScreenShare={onStartScreenShare}
        callActive={callActive}
        onBack={onBack}
        onToggleMemberPanel={() => {
          if (activeChat?.kind === "dm") {
            onOpenProfile?.((activeChat.chat as any).otherUserId);
          } else if (activeChat?.kind === "group") {
            const groupManager = (activeChat.chat as any).groupManagerId;
            if (groupManager) {
              onOpenProfile?.(groupManager);
            } else if ((activeChat.chat as any).members?.[0]?.userId) {
              onOpenProfile?.((activeChat.chat as any).members[0].userId);
            }
          }
        }}
      />

      {/* Messages Scroll Area */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{ flexGrow: 1, overflowY: "auto", px: { xs: 1.5, sm: 2, md: 3 }, py: 2, display: "flex", flexDirection: "column", gap: 1.25 }}
      >
        {/* Loading / Load More Older Messages Header */}
        {loadingOlder && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 1.5, gap: 1 }}>
            <CircularProgress size={18} thickness={5} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Loading older messages...
            </Typography>
          </Box>
        )}
        {hasMoreOlder && !loadingOlder && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <Chip
              label="↑ Load older messages"
              size="small"
              onClick={() => {
                if (scrollContainerRef.current) {
                  isPrependingOlderRef.current = true;
                  prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
                }
                onLoadOlder?.();
              }}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "11px",
                bgcolor: "action.hover",
                "&:hover": { bgcolor: "action.selected" },
              }}
            />
          </Box>
        )}

        {groupedItems.length === 0 ? (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.6, p: 4, textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              End-to-End Encrypted Communication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              Messages, code snippets, and diagrams are securely encrypted on your device.
            </Typography>
          </Box>
        ) : (
          groupedItems.map((item) =>
            item.kind === "date" ? (
              <Box key={item.key} sx={{ display: "flex", alignItems: "center", my: 2.5, position: "relative" }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Chip
                  label={item.label}
                  size="small"
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    fontWeight: 700,
                    fontSize: "12px",
                    color: "text.primary",
                    px: 1,
                    height: 26,
                    borderRadius: "13px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                />
                <Divider sx={{ flexGrow: 1 }} />
              </Box>
            ) : (
              <CleanMessageRow
                key={item.key}
                msg={item.msg}
                userId={userId}
                sender={resolveSender(item.msg.senderId, item.msg.senderName)}
                resolveMemberName={(uid) => resolveSender(uid).name}
                onOpenProfile={onOpenProfile}
                onOpenTicket={onOpenTicket}
                onStartCall={onStartCall}
                callActive={callActive}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onReactMessage={onReactMessage}
              />
            ),
          )
        )}
        <div ref={bottomRef} />
      </Box>

      {/* File preview strip */}
      {pendingFile && (
        <Box sx={{ p: { xs: 1.25, sm: 2 }, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, flexWrap: "wrap" }}>
          {previewUrl ? (
            <Box component="img" src={previewUrl} alt="preview" sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: "cover", border: "1px solid", borderColor: "divider" }} />
          ) : (
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: "action.selected", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider", color: "text.secondary" }}>
              {pendingFile.type === "application/pdf" ? (
                <DescriptionIcon color="error" />
              ) : pendingFile.type.startsWith("video/") ? (
                <VideocamIcon />
              ) : (
                <DescriptionIcon />
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{pendingFile.name}</Typography>
            <Typography variant="caption" color="text.secondary">{formatBytes(pendingFile.size)}</Typography>
          </Box>

          <TextFieldAny
            placeholder="Add an optional note…"
            value={caption}
            onChange={(e: any) => setCaption(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") sendFile();
            }}
            disabled={uploading}
            size="small"
            sx={{ width: { xs: "100%", sm: 260 }, order: { xs: 3, sm: 0 } }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
            <IconButton
              onClick={sendFile}
              disabled={uploading || connStatus !== "connected"}
              color="primary"
              size="small"
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              {uploading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>

            <IconButton onClick={cancelFile} disabled={uploading} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {fileError && (
        <Alert severity="error" sx={{ mx: { xs: 1.5, sm: 3 }, mb: 1 }}>
          {fileError}
        </Alert>
      )}

      {/* Input container with Slack-style formatting toolbar */}
      <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <input ref={fileInputRef} type="file" accept={ACCEPT_DOCS} style={{ display: "none" }} onChange={handleFileChange} />
        <input ref={imageInputRef} type="file" accept={ACCEPT_IMAGES} style={{ display: "none" }} onChange={handleFileChange} />
        <input ref={videoInputRef} type="file" accept={ACCEPT_VIDEOS} style={{ display: "none" }} onChange={handleFileChange} />
        <input ref={pdfInputRef} type="file" accept={ACCEPT_PDF} style={{ display: "none" }} onChange={handleFileChange} />
        <input ref={docInputRef} type="file" accept={ACCEPT_DOCS} style={{ display: "none" }} onChange={handleFileChange} />

        <Paper
          variant="outlined"
          sx={{
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            "&:focus-within": {
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px rgba(2, 132, 199, 0.12)",
            },
          }}
        >
          {/* Top Formatting Action Buttons (Slack-style: Visible when toggled via Aa button) */}
          {showFormatBar && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                px: 1,
                py: 0.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
                flexWrap: "wrap",
                animation: "fadeIn 0.15s ease",
              }}
            >
              <Tooltip title="Bold (Ctrl+B)">
                <IconButton size="small" onClick={() => applyFormat("**", "**", "bold text")} sx={{ p: 0.5 }}>
                  <FormatBoldIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Italic (Ctrl+I)">
                <IconButton size="small" onClick={() => applyFormat("*", "*", "italic text")} sx={{ p: 0.5 }}>
                  <FormatItalicIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Strikethrough">
                <IconButton size="small" onClick={() => applyFormat("~", "~", "strike text")} sx={{ p: 0.5 }}>
                  <StrikethroughSIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

              <Tooltip title="Link (Ctrl+K)">
                <IconButton size="small" onClick={() => applyFormat("[", "](https://)", "link title")} sx={{ p: 0.5 }}>
                  <InsertLinkIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

              <Tooltip title="Bulleted List">
                <IconButton size="small" onClick={() => insertLinePrefix("• ")} sx={{ p: 0.5 }}>
                  <FormatListBulletedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Numbered List">
                <IconButton size="small" onClick={() => insertLinePrefix("1. ")} sx={{ p: 0.5 }}>
                  <FormatListNumberedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Quote">
                <IconButton size="small" onClick={() => insertLinePrefix("> ")} sx={{ p: 0.5 }}>
                  <FormatQuoteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

              <Tooltip title="Inline Code (Ctrl+E)">
                <IconButton size="small" onClick={() => applyFormat("`", "`", "code")} sx={{ p: 0.5 }}>
                  <CodeIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Code Block">
                <IconButton size="small" onClick={() => applyFormat("```\n", "\n```", "code block")} sx={{ p: 0.5 }}>
                  <DataObjectIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Text Editor Area */}
          <TextFieldAny
            inputRef={inputRefCallback}
            placeholder={
              connStatus === "connected"
                ? `Message ${chatDisplayName}… (Enter to send, Shift+Enter for new line)`
                : "Connecting to secure network…"
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={connStatus !== "connected"}
            multiline
            minRows={showFormatBar ? 2 : 1}
            maxRows={8}
            fullWidth
            variant="standard"
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              "& .MuiInputBase-root": {
                px: 2,
                py: 1.25,
                fontSize: "13.5px",
                lineHeight: 1.5,
              },
              "& .MuiInputBase-input": {
                p: 0,
                fontSize: "13.5px",
                lineHeight: 1.5,
              },
            }}
          />

          {/* Bottom Toolbar with Slack Controls & Send */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.5,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            {/* Left Action Buttons (Slack style: +, Aa, 🙂, @, Canvas) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {/* Attach Menu Button (+) */}
              <Tooltip title="Add files, docs, images">
                <IconButton
                  size="small"
                  onClick={(e) => setAttachMenuAnchor(e.currentTarget)}
                  disabled={connStatus !== "connected" || !!pendingFile}
                  sx={{
                    p: 0.5,
                    borderRadius: "6px",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Formatting Toggle Button (Aa) */}
              <Tooltip title={showFormatBar ? "Hide formatting (Ctrl+Shift+X)" : "Show formatting (Ctrl+Shift+X)"}>
                <IconButton
                  size="small"
                  onClick={() => setShowFormatBar((prev) => !prev)}
                  sx={{
                    px: 0.75,
                    py: 0.35,
                    borderRadius: "6px",
                    bgcolor: showFormatBar ? "action.selected" : "transparent",
                    color: showFormatBar ? "primary.main" : "text.primary",
                    fontWeight: 800,
                    fontSize: "13px",
                    lineHeight: 1,
                    textDecoration: "underline",
                    "&:hover": { bgcolor: showFormatBar ? "action.selected" : "action.hover" },
                  }}
                >
                  Aa
                </IconButton>
              </Tooltip>

              {/* Emoji Picker Button (🙂) */}
              <Tooltip title="Insert Emoji">
                <IconButton
                  size="small"
                  onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  disabled={connStatus !== "connected"}
                  sx={{
                    p: 0.5,
                    borderRadius: "6px",
                    color: emojiAnchor ? "primary.main" : "text.secondary",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <SentimentSatisfiedAltIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Mention Button (@) */}
              <Tooltip title="Mention someone">
                <IconButton
                  size="small"
                  onClick={() => insertLinePrefix("@")}
                  disabled={connStatus !== "connected"}
                  sx={{
                    p: 0.5,
                    borderRadius: "6px",
                    color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <AlternateEmailIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

              {/* Whiteboard / Canvas Button */}
              <Tooltip title="Excalidraw Whiteboard Canvas">
                <IconButton
                  size="small"
                  onClick={() => setCanvasOpen(true)}
                  disabled={connStatus !== "connected" || !!pendingFile}
                  sx={{
                    p: 0.5,
                    borderRadius: "6px",
                    color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <BrushIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Right Send Button */}
            <IconButton
              onClick={send}
              disabled={connStatus !== "connected" || !input.trim()}
              color="primary"
              size="small"
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                borderRadius: "8px",
                p: 0.65,
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              <SendIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Paper>

        <Menu
          anchorEl={attachMenuAnchor}
          open={Boolean(attachMenuAnchor)}
          onClose={() => setAttachMenuAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{ paper: { sx: { borderRadius: "10px", minWidth: 200, mt: -1 } } }}
        >
          <MenuItem onClick={() => { imageInputRef.current?.click(); setAttachMenuAnchor(null); }} sx={{ gap: 1.5, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><ImageIcon sx={{ color: "#4caf50", fontSize: 18 }} /></ListItemIcon>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Image</Typography>
          </MenuItem>
          <MenuItem onClick={() => { pdfInputRef.current?.click(); setAttachMenuAnchor(null); }} sx={{ gap: 1.5, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><PictureAsPdfIcon sx={{ color: "#f44336", fontSize: 18 }} /></ListItemIcon>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>PDF Document</Typography>
          </MenuItem>
          <MenuItem onClick={() => { videoInputRef.current?.click(); setAttachMenuAnchor(null); }} sx={{ gap: 1.5, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><VideoLibraryIcon sx={{ color: "#9c27b0", fontSize: 18 }} /></ListItemIcon>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Video</Typography>
          </MenuItem>
          <MenuItem onClick={() => { docInputRef.current?.click(); setAttachMenuAnchor(null); }} sx={{ gap: 1.5, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><InsertDriveFileIcon sx={{ color: "#2196f3", fontSize: 18 }} /></ListItemIcon>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Document</Typography>
          </MenuItem>
        </Menu>

        <Popover
          open={Boolean(emojiAnchor)}
          anchorEl={emojiAnchor}
          onClose={() => setEmojiAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                mb: 1,
              },
            },
          }}
        >
          <EmojiPicker
            onSelectEmoji={(emoji) => {
              setInput((prev) => prev + emoji);
              setEmojiAnchor(null);
            }}
            onSelectGif={(gifUrl) => {
              setInput((prev) => (prev.trim() ? prev + "\n" + gifUrl : gifUrl));
              setEmojiAnchor(null);
            }}
            onClose={() => setEmojiAnchor(null)}
          />
        </Popover>
      </Box>
    </Box>
  );
}

// ── Call Message Formatting ──
function formatCallDuration(sec: number): string {
  if (!sec || sec <= 0) return "< 1 min";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

interface CallInfo {
  callType: "audio" | "video";
  status: "completed" | "missed" | "declined" | "busy";
  duration: number;
}

function parseCallInfo(content?: string): CallInfo {
  if (!content) {
    return { callType: "audio", status: "completed", duration: 0 };
  }
  try {
    const data = JSON.parse(content);
    return {
      callType: data.callType === "video" ? "video" : "audio",
      status: ["completed", "missed", "declined", "busy"].includes(data.status) ? data.status : "completed",
      duration: typeof data.duration === "number" ? data.duration : 0,
    };
  } catch {
    return { callType: "audio", status: "completed", duration: 0 };
  }
}

// ── CallMessageCard Component ──
function CallMessageCard({
  msg,
  isMe,
  onStartCall,
  callActive,
}: {
  msg: ChatMessage;
  isMe: boolean;
  onStartCall?: (type: "audio" | "video") => void;
  callActive?: boolean;
}) {
  const { callType, status, duration } = parseCallInfo(msg.content);
  const isVideo = callType === "video";
  const isMissedAlert = status === "missed" && !isMe;

  let title = "";
  let subtitle = "";
  let buttonText = isMe ? "Call again" : "Call back";
  let badgeIcon = <CallIcon sx={{ fontSize: 20, color: "#10b981" }} />;
  let badgeBg = "rgba(16, 185, 129, 0.12)";

  if (status === "missed") {
    if (isMe) {
      title = `Unanswered ${isVideo ? "video" : "voice"} call`;
      subtitle = "No answer";
      badgeIcon = <CallMissedIcon sx={{ fontSize: 20, color: "text.secondary" }} />;
      badgeBg = "action.hover";
    } else {
      title = `Missed ${isVideo ? "video" : "voice"} call`;
      subtitle = "Missed call";
      badgeIcon = <CallMissedIcon sx={{ fontSize: 20, color: "#ef4444" }} />;
      badgeBg = "rgba(239, 68, 68, 0.12)";
    }
  } else if (status === "completed") {
    title = `${isMe ? "Outgoing" : "Incoming"} ${isVideo ? "video" : "voice"} call`;
    subtitle = `Duration: ${formatCallDuration(duration)}`;
    badgeIcon = isVideo ? (
      <VideocamIcon sx={{ fontSize: 20, color: "#10b981" }} />
    ) : (
      <CallIcon sx={{ fontSize: 20, color: "#10b981" }} />
    );
    badgeBg = "rgba(16, 185, 129, 0.12)";
  } else if (status === "declined") {
    title = `Declined ${isVideo ? "video" : "voice"} call`;
    subtitle = isMe ? "Call declined by recipient" : "Declined";
    badgeIcon = <PhoneDisabledIcon sx={{ fontSize: 20, color: "#f59e0b" }} />;
    badgeBg = "rgba(245, 158, 11, 0.12)";
  } else if (status === "busy") {
    title = `${isVideo ? "Video" : "Voice"} call • Busy`;
    subtitle = "Recipient was busy";
    badgeIcon = <PhoneDisabledIcon sx={{ fontSize: 20, color: "#f59e0b" }} />;
    badgeBg = "rgba(245, 158, 11, 0.12)";
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2.5,
        mt: 0.5,
        py: 1,
        px: 1.75,
        borderRadius: "10px",
        bgcolor: isMissedAlert ? "rgba(239, 68, 68, 0.04)" : "action.hover",
        border: "1px solid",
        borderColor: isMissedAlert ? "rgba(239, 68, 68, 0.3)" : "divider",
        minWidth: { xs: 0, sm: 300 },
        maxWidth: { xs: "100%", sm: 420 },
        width: { xs: "100%", sm: "auto" },
        transition: "all 0.15s ease",
        "&:hover": {
          borderColor: isMissedAlert ? "error.main" : "primary.main",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: badgeBg,
            flexShrink: 0,
          }}
        >
          {badgeIcon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: "13.5px",
              color: isMissedAlert ? "error.main" : "text.primary",
              lineHeight: 1.25,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: "12px",
              color: isMissedAlert ? "error.dark" : "text.secondary",
              fontWeight: isMissedAlert ? 600 : 400,
              display: "block",
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      <Tooltip title={callActive ? "Call currently in progress" : buttonText}>
        <span>
          <Button
            size="small"
            variant="outlined"
            disabled={callActive}
            onClick={(e) => {
              e.stopPropagation();
              onStartCall?.(callType);
            }}
            startIcon={
              isVideo ? (
                <VideocamIcon sx={{ fontSize: 16 }} />
              ) : (
                <CallIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "12px",
              py: 0.4,
              px: 1.25,
              borderColor: isMissedAlert ? "error.main" : "divider",
              color: isMissedAlert ? "error.main" : "text.primary",
              bgcolor: "background.paper",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "&:hover": {
                bgcolor: isMissedAlert ? "rgba(239, 68, 68, 0.08)" : "action.selected",
                borderColor: isMissedAlert ? "error.dark" : "primary.main",
              },
            }}
          >
            {buttonText}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}

// ── CleanMessageRow: Official Slack Document-style Message Row ──
function CleanMessageRow({
  msg,
  userId,
  sender,
  resolveMemberName,
  onOpenProfile,
  onOpenTicket,
  onStartCall,
  callActive,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
}: {
  msg: ChatMessage;
  userId: string;
  sender: { name: string; avatarUrl?: string };
  resolveMemberName?: (userId: string) => string;
  onOpenProfile?: (userId: string) => void;
  onOpenTicket?: (ticketNumber: string) => void;
  onStartCall?: (type: "audio" | "video") => void;
  callActive?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string, deleteForEveryone: boolean) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reactionPickerAnchor, setReactionPickerAnchor] = useState<HTMLElement | null>(null);

  const isMe = msg.senderId?.toLowerCase() === userId?.toLowerCase();
  const isDecryptionError = msg.content === "[Unable to decrypt]";
  const isSystemJoinMessage = msg.content?.toLowerCase().includes("joined #") || msg.content?.toLowerCase().includes("joined the workspace");
  const isDeleted = msg.isDeleted;

  const copyContent = () => {
    if (msg.type === "call") {
      const { callType, status, duration } = parseCallInfo(msg.content);
      const str = status === "missed" ? `Missed ${callType} call` : `${callType} call (${formatCallDuration(duration)})`;
      navigator.clipboard.writeText(str);
      return;
    }
    if (msg.content) navigator.clipboard.writeText(msg.content);
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: { xs: 1, sm: 1.5 },
        width: "100%",
        py: 0.65,
        px: { xs: 1, sm: 2 },
        mx: { xs: -1, sm: -2 },
        borderRadius: "6px",
        position: "relative",
        transition: "background-color 0.1s ease",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Slack-style Floating Quick Action Toolbar on Hover */}
      {hovered && !isEditing && !isDeleted && (
        <Box
          sx={{
            position: "absolute",
            top: -14,
            right: { xs: 4, sm: 16 },
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            bgcolor: "background.paper",
            px: 0.75,
            py: 0.25,
            borderRadius: "6px",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {QUICK_REACTIONS.slice(0, 5).map((emoji, idx) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => onReactMessage?.(msg.id, emoji)}
              sx={{
                display: idx >= 3 ? { xs: "none", sm: "inline-flex" } : "inline-flex",
                p: 0.35,
                fontSize: "13px",
                lineHeight: 1,
                borderRadius: "4px",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {emoji}
            </IconButton>
          ))}

          <Tooltip title="Add reaction">
            <IconButton
              size="small"
              onClick={(e) => setReactionPickerAnchor(e.currentTarget)}
              sx={{ p: 0.35 }}
            >
              <AddReactionIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

          {/* Edit (only text and isMe) */}
          {isMe && msg.type === "text" && (
            <Tooltip title="Edit message">
              <IconButton
                size="small"
                onClick={() => {
                  setEditText(msg.content || "");
                  setIsEditing(true);
                }}
                sx={{ p: 0.35 }}
              >
                <EditIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Delete */}
          <Tooltip title="Delete message">
            <IconButton
              size="small"
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ p: 0.35 }}
            >
              <DeleteIcon sx={{ fontSize: 14, color: "error.main" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Copy text">
            <IconButton size="small" onClick={copyContent} sx={{ p: 0.35 }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Reaction Picker Popover */}
      <Popover
        open={Boolean(reactionPickerAnchor)}
        anchorEl={reactionPickerAnchor}
        onClose={() => setReactionPickerAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <EmojiPicker
          onSelectEmoji={(emoji: string) => {
            onReactMessage?.(msg.id, emoji);
            setReactionPickerAnchor(null);
          }}
          onClose={() => setReactionPickerAnchor(null)}
        />
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1, maxWidth: 380, width: "100%" },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "16px", pb: 0.5 }}>
          Delete message?
        </DialogTitle>
        <DialogContent sx={{ color: "text.secondary", fontSize: "13.5px", pt: 0.5 }}>
          {isMe
            ? "Would you like to delete this message just for you, or for everyone in this chat?"
            : "This message will be removed from your chat history."}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: "flex", flexDirection: "column", gap: 1, alignItems: "stretch" }}>
          <Button
            variant="outlined"
            onClick={() => {
              setDeleteDialogOpen(false);
              onDeleteMessage?.(msg.id, false);
            }}
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}
          >
            Delete for me
          </Button>
          {isMe && (
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDeleteMessage?.(msg.id, true);
              }}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}
            >
              Delete for everyone
            </Button>
          )}
          <Button
            variant="text"
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: "8px", textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Avatar (Square with rounded corners - Slack standard) */}
      <Tooltip title={`View ${sender.name}'s profile`}>
        <Box sx={{ flexShrink: 0, pt: 0.25, cursor: "pointer" }}>
          <Avatar
            name={sender.name}
            src={sender.avatarUrl}
            size={36}
            borderRadius="6px"
            onClick={() => onOpenProfile?.(msg.senderId)}
          />
        </Box>
      </Tooltip>

      {/* Message Content Body (Flat Slack Stream - No Bubbles, No Borders) */}
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        {/* Header Line: Bold Name + Timestamp + Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            lineHeight: 1.2,
          }}
        >
          <Typography
            component="span"
            onClick={() => onOpenProfile?.(msg.senderId)}
            sx={{
              fontWeight: 800,
              fontSize: "14px",
              color: "text.primary",
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {sender.name}
          </Typography>

          <Typography
            component="span"
            variant="caption"
            sx={{
              fontSize: "12px",
              color: "text.secondary",
              fontWeight: 400,
            }}
          >
            {fmtTime(msg.sentAt)}
          </Typography>

          {msg.isEdited && !isDeleted && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                fontSize: "11px",
                color: "text.secondary",
                fontStyle: "italic",
                opacity: 0.8,
              }}
            >
              (edited)
            </Typography>
          )}

          {isMe && (
            <Box sx={{ display: "inline-flex", alignItems: "center", opacity: 0.75, ml: -0.25 }}>
              {msg._temp ? (
                <Typography sx={{ fontSize: "9px" }}>🕒</Typography>
              ) : msg.status === "read" ? (
                <DoneAllIcon sx={{ fontSize: 13, color: "primary.main" }} />
              ) : (
                <CheckIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              )}
            </Box>
          )}
        </Box>

        {/* Message Content */}
        {isDeleted ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              color: "text.secondary",
              fontStyle: "italic",
              fontSize: "13.5px",
              py: 0.25,
            }}
          >
            <BlockIcon sx={{ fontSize: 15, opacity: 0.6 }} />
            <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: "13.5px", color: "text.secondary" }}>
              This message was deleted
            </Typography>
          </Box>
        ) : isEditing ? (
          /* Inline Editor */
          <Box sx={{ mt: 0.5, width: "100%", maxWidth: 640 }}>
            <TextField
              fullWidth
              multiline
              size="small"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editText.trim() && editText.trim() !== msg.content) {
                    onEditMessage?.(msg.id, editText.trim());
                  }
                  setIsEditing(false);
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  bgcolor: "background.paper",
                  fontSize: "14px",
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 1, mt: 0.75, alignItems: "center" }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  if (editText.trim() && editText.trim() !== msg.content) {
                    onEditMessage?.(msg.id, editText.trim());
                  }
                  setIsEditing(false);
                }}
                sx={{ borderRadius: "6px", textTransform: "none", fontWeight: 700, fontSize: "12px", py: 0.25, px: 1.5 }}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => setIsEditing(false)}
                sx={{ borderRadius: "6px", textTransform: "none", fontSize: "12px", color: "text.secondary", py: 0.25, px: 1 }}
              >
                Cancel
              </Button>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px", ml: 1 }}>
                escape to cancel • enter to save
              </Typography>
            </Box>
          </Box>
        ) : msg.type === "call" ? (
          <CallMessageCard
            msg={msg}
            isMe={isMe}
            onStartCall={onStartCall}
            callActive={callActive}
          />
        ) : (
          <>
            {msg.content && (
              <Box
                sx={{
                  color: isDecryptionError ? "error.main" : "text.primary",
                  fontSize: "14.5px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  fontStyle: isSystemJoinMessage ? "italic" : "normal",
                  opacity: isSystemJoinMessage ? 0.8 : 1,
                  textAlign: "left",
                }}
              >
                <FormattedMessage content={msg.content} onOpenTicket={onOpenTicket} />
              </Box>
            )}

            {/* File Attachment */}
            {msg.fileUrl && (
              <Box sx={{ mt: 0.5 }}>
                <FileAttachment msg={msg} />
              </Box>
            )}
          </>
        )}

        {/* Reactions Chips Bar */}
        {!isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
              if (!userIds || userIds.length === 0) return null;
              const userReacted = userIds.includes(userId);
              const tooltipNames = userIds
                .map((uid) => (uid === userId ? "You" : (resolveMemberName ? resolveMemberName(uid) : "Someone")))
                .join(", ");

              return (
                <Tooltip key={emoji} title={`${tooltipNames} reacted with ${emoji}`}>
                  <Chip
                    size="small"
                    label={`${emoji} ${userIds.length}`}
                    onClick={() => onReactMessage?.(msg.id, emoji)}
                    sx={{
                      height: 24,
                      fontSize: "12px",
                      fontWeight: userReacted ? 700 : 500,
                      cursor: "pointer",
                      bgcolor: userReacted ? "action.selected" : "background.paper",
                      border: "1px solid",
                      borderColor: userReacted ? "primary.main" : "divider",
                      borderRadius: "12px",
                      "&:hover": {
                        bgcolor: userReacted ? "action.selected" : "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                  />
                </Tooltip>
              );
            })}

            <Tooltip title="Add reaction">
              <IconButton
                size="small"
                onClick={(e) => setReactionPickerAnchor(e.currentTarget)}
                sx={{
                  width: 24,
                  height: 24,
                  p: 0,
                  borderRadius: "12px",
                  border: "1px dashed",
                  borderColor: "divider",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <AddReactionIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── FileAttachment Component ──
function FileAttachment({ msg }: { msg: ChatMessage }) {
  const type = msg.type ?? "";
  const url = msg.fileUrl!;
  const name = msg.fileName ?? "file";
  const size = msg.fileSize ? formatBytes(msg.fileSize) : null;

  if (type === "image") {
    return (
      <Box sx={{ maxWidth: 380, borderRadius: "6px", overflow: "hidden", border: "1px solid", borderColor: "divider", mt: 0.5 }}>
        <Box
          component="img"
          src={url}
          alt={name}
          sx={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block", cursor: "pointer" }}
          onClick={() => window.open(url, "_blank")}
        />
      </Box>
    );
  }

  return (
    <Box
      onClick={() => window.open(url, "_blank")}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.25,
        pr: 2,
        borderRadius: "6px",
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        maxWidth: 360,
        "&:hover": { bgcolor: "action.selected", borderColor: "primary.main" },
      }}
    >
      <InsertDriveFileIcon sx={{ fontSize: 22, color: "primary.main" }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "12.5px" }} noWrap>
          {name}
        </Typography>
        {size && (
          <Typography variant="caption" sx={{ fontSize: "11px", color: "text.secondary" }}>
            {size}
          </Typography>
        )}
      </Box>
    </Box>
  );
}