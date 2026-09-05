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
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import VideocamIcon from "@mui/icons-material/Videocam";
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
  onOpenProfile?: (userId: string) => void;
  onStartCall?: (type: "audio" | "video") => void;
  onStartScreenShare?: () => void;
  callActive?: boolean;
  onOpenTicket?: (ticketNumber: string) => void;
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
  onOpenProfile,
  onStartCall,
  onStartScreenShare,
  callActive = false,
  onOpenTicket,
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: { xs: 2, md: 3 }, py: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
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
                onOpenProfile={onOpenProfile}
                onReactEmoji={(emoji) => setInput((prev) => prev + emoji)}
                onOpenTicket={onOpenTicket}
              />
            ),
          )
        )}
        <div ref={bottomRef} />
      </Box>

      {/* File preview strip */}
      {pendingFile && (
        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: 2 }}>
          {previewUrl ? (
            <Box component="img" src={previewUrl} alt="preview" sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: "cover", border: "1px solid", borderColor: "divider" }} />
          ) : (
            <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: "action.selected", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider", color: "text.secondary" }}>
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
            sx={{ width: 260 }}
          />

          <IconButton
            onClick={sendFile}
            disabled={uploading || connStatus !== "connected"}
            color="primary"
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            {uploading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>

          <IconButton onClick={cancelFile} disabled={uploading} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      {fileError && (
        <Alert severity="error" sx={{ mx: 3, mb: 1 }}>
          {fileError}
        </Alert>
      )}

      {/* Input container with Slack-style formatting toolbar */}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
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

// ── CleanMessageRow: Official Slack Document-style Message Row ──
function CleanMessageRow({
  msg,
  userId,
  sender,
  onOpenProfile,
  onReactEmoji,
  onOpenTicket,
}: {
  msg: ChatMessage;
  userId: string;
  sender: { name: string; avatarUrl?: string };
  onOpenProfile?: (userId: string) => void;
  onReactEmoji?: (emoji: string) => void;
  onOpenTicket?: (ticketNumber: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isMe = msg.senderId?.toLowerCase() === userId?.toLowerCase();
  const isDecryptionError = msg.content === "[Unable to decrypt]";
  const isSystemJoinMessage = msg.content?.toLowerCase().includes("joined #") || msg.content?.toLowerCase().includes("joined the workspace");

  const copyContent = () => {
    if (msg.content) navigator.clipboard.writeText(msg.content);
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        width: "100%",
        py: 0.65,
        px: 2,
        mx: -2,
        borderRadius: "6px",
        position: "relative",
        transition: "background-color 0.1s ease",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Slack-style Floating Quick Action Toolbar on Hover */}
      {hovered && (
        <Box
          sx={{
            position: "absolute",
            top: -14,
            right: 16,
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
          {QUICK_REACTIONS.slice(0, 5).map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => (onReactEmoji ? onReactEmoji(emoji) : copyContent())}
              sx={{
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

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />

          <Tooltip title="Copy text">
            <IconButton size="small" onClick={copyContent} sx={{ p: 0.35 }}>
              <ContentCopyOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

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

        {/* Message Text Content */}
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