import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import BrushIcon from "@mui/icons-material/Brush";
import TagIcon from "@mui/icons-material/Tag";

import {
  api,
  type ChatMessage,
  type OrganizationResponseDto,
  type MemberResponseDto,
  type WorkspaceFileDto,
} from "../lib/api";
import { Avatar } from "./Avatar";
import { fmtDate } from "../lib/utils";

const TextFieldAny = TextField as any;

interface Props {
  org: OrganizationResponseDto;
  members?: MemberResponseDto[];
  messages?: Record<string, ChatMessage[]>;
  authToken?: string | null;
  currentUserId?: string;
}

export function FilesView({
  org,
  members = [],
  messages = {},
  authToken,
  currentUserId,
}: Props) {
  const [apiFiles, setApiFiles] = useState<WorkspaceFileDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [directionTab, setDirectionTab] = useState<"all" | "sent" | "received">("all");

  // Fetch from backend API
  const fetchFiles = useCallback(async () => {
    if (!authToken || !org?.id) return;
    setLoading(true);
    try {
      const data = await api.orgs.getFiles(authToken, org.id, {
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        type: filterType !== "all" ? filterType : undefined,
      });
      setApiFiles(data);
    } catch (err: any) {
      console.warn("Failed to fetch workspace files from API:", err);
    } finally {
      setLoading(false);
    }
  }, [authToken, org?.id, selectedUserId, filterType]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Combine API files with any unsaved in-memory active chat message attachments
  const allFiles = useMemo(() => {
    const map = new Map<string, WorkspaceFileDto>();

    // 1. Add API files
    for (const f of apiFiles) {
      map.set(f.fileUrl, f);
    }

    // 2. Merge local active chat files
    for (const chatMsgs of Object.values(messages)) {
      for (const m of chatMsgs) {
        if (m.fileUrl && !map.has(m.fileUrl)) {
          const isMe = m.senderId === currentUserId;
          map.set(m.fileUrl, {
            id: m.id || `${m.sentAt}-${Math.random()}`,
            organizationId: m.organizationId || org.id,
            chatId: m.chatId,
            chatType: m.chatType,
            chatName: m.chatType === "group" ? "Channel" : "Direct Chat",
            senderId: m.senderId,
            senderUsername: m.senderName || (isMe ? "You" : "Member"),
            fileName: m.fileName || "Attachment",
            fileUrl: m.fileUrl,
            fileType: m.type || m.fileType,
            fileSize: m.fileSize,
            sentAt: m.sentAt,
            isMe: isMe,
          });
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }, [apiFiles, messages, currentUserId, org.id]);

  // Filter combined list by Direction, User, Type, Search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allFiles.filter((f) => {
      // Direction filter
      if (directionTab === "sent" && !f.isMe) return false;
      if (directionTab === "received" && f.isMe) return false;

      // User filter
      if (selectedUserId !== "all" && f.senderId !== selectedUserId) return false;

      // Type filter
      if (filterType === "image" && f.fileType !== "image") return false;
      if (filterType === "pdf" && f.fileType !== "pdf") return false;
      if (filterType === "video" && f.fileType !== "video") return false;
      if (
        filterType === "doc" &&
        (f.fileType === "image" || f.fileType === "pdf" || f.fileType === "video")
      ) {
        return false;
      }

      // Search query
      if (q) {
        const matchName = f.fileName?.toLowerCase().includes(q);
        const matchSender = f.senderUsername?.toLowerCase().includes(q);
        const matchChat = f.chatName?.toLowerCase().includes(q);
        if (!matchName && !matchSender && !matchChat) return false;
      }

      return true;
    });
  }, [allFiles, directionTab, selectedUserId, filterType, search]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalBytes = 0;
    let imagesCount = 0;
    let docsCount = 0;
    let sentCount = 0;
    let receivedCount = 0;

    for (const f of allFiles) {
      if (f.fileSize) totalBytes += f.fileSize;
      if (f.fileType === "image") imagesCount++;
      else docsCount++;

      if (f.isMe) sentCount++;
      else receivedCount++;
    }

    return {
      total: allFiles.length,
      totalBytes,
      imagesCount,
      docsCount,
      sentCount,
      receivedCount,
    };
  }, [allFiles]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflowY: "auto",
        p: { xs: 2.5, md: 4 },
      }}
    >
      {/* Top Header Banner */}
      <Box
        sx={{
          mb: 3,
          pb: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.015em", color: "text.primary" }}>
            Workspace Files & Diagrams
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Central repository of shared attachments, whiteboards, diagrams, and encrypted media in {org.name}.
          </Typography>
        </div>

        <Tooltip title="Refresh workspace files">
          <Button
            variant="outlined"
            size="small"
            onClick={fetchFiles}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
          >
            {loading ? "Syncing…" : "Refresh"}
          </Button>
        </Tooltip>
      </Box>

      {/* Filter and Search Controls (Single Clean Line) */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 3,
          borderRadius: "12px",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: { xs: "wrap", md: "nowrap" },
        }}
      >
        {/* Big Search Input */}
        <TextFieldAny
          placeholder="Search by filename, sender, or channel…"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
            style: { fontSize: "0.85rem", borderRadius: 8, height: 38 },
          }}
          sx={{ flexGrow: 1, minWidth: { xs: "100%", sm: 260 } }}
        />

        {/* Direction Filter */}
        <FormControl size="small" sx={{ minWidth: 140, flexShrink: 0 }}>
          <InputLabel id="direction-filter-label" sx={{ fontSize: "13px" }}>
            Direction
          </InputLabel>
          <Select
            labelId="direction-filter-label"
            value={directionTab}
            label="Direction"
            onChange={(e) => setDirectionTab(e.target.value as any)}
            sx={{ fontSize: "13px", borderRadius: "8px", height: 38 }}
          >
            <MenuItem value="all">All Files ({allFiles.length})</MenuItem>
            <MenuItem value="sent">Sent by Me ({stats.sentCount})</MenuItem>
            <MenuItem value="received">Received ({stats.receivedCount})</MenuItem>
          </Select>
        </FormControl>

        {/* Member Dropdown */}
        <FormControl size="small" sx={{ minWidth: 170, flexShrink: 0 }}>
          <InputLabel id="user-filter-label" sx={{ fontSize: "13px" }}>
            Filter by Member
          </InputLabel>
          <Select
            labelId="user-filter-label"
            value={selectedUserId}
            label="Filter by Member"
            onChange={(e) => setSelectedUserId(e.target.value)}
            renderValue={(val) => {
              if (val === "all") return "All Members";
              const found = members.find((m) => m.userId === val);
              return found ? `${found.username}${found.userId === currentUserId ? " (You)" : ""}` : "All Members";
            }}
            sx={{ fontSize: "13px", borderRadius: "8px", height: 38 }}
          >
            <MenuItem value="all">
              <em>All Members</em>
            </MenuItem>
            {members.map((m) => (
              <MenuItem key={m.userId} value={m.userId} sx={{ gap: 1 }}>
                <Avatar name={m.username} src={m.avatarUrl} size={20} />
                <Typography variant="body2" sx={{ fontSize: "13px" }}>
                  {m.username} {m.userId === currentUserId ? "(You)" : ""}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* File Type Dropdown */}
        <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
          <InputLabel id="type-filter-label" sx={{ fontSize: "13px" }}>
            File Type
          </InputLabel>
          <Select
            labelId="type-filter-label"
            value={filterType}
            label="File Type"
            onChange={(e) => setFilterType(e.target.value)}
            renderValue={(val) => {
              switch (val) {
                case "image": return "Diagrams & Images";
                case "pdf": return "PDF Documents";
                case "video": return "Video Media";
                case "doc": return "Other Documents";
                default: return "All File Types";
              }
            }}
            sx={{ fontSize: "13px", borderRadius: "8px", height: 38 }}
          >
            <MenuItem value="all">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <span>All File Types</span>
              </Box>
            </MenuItem>
            <MenuItem value="image">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BrushIcon sx={{ fontSize: 16, color: "#0891b2" }} />
                <span>Diagrams & Images</span>
              </Box>
            </MenuItem>
            <MenuItem value="pdf">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PictureAsPdfOutlinedIcon sx={{ fontSize: 16, color: "#dc2626" }} />
                <span>PDF Documents</span>
              </Box>
            </MenuItem>
            <MenuItem value="video">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VideoLibraryOutlinedIcon sx={{ fontSize: 16, color: "#9333ea" }} />
                <span>Video Media</span>
              </Box>
            </MenuItem>
            <MenuItem value="doc">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                <span>Other Documents</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Grid of Files */}
      {loading && allFiles.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 2 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Fetching shared files from workspace repository…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "12px",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 44, color: "text.secondary", mb: 1.5, opacity: 0.6 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            No files match your filters
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Try selecting "All Members" or clear your search query to see other workspace attachments.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(auto-fill, minmax(280px, 1fr))",
            },
            gap: 2.5,
          }}
        >
          {filtered.map((file) => {
            const isImg = file.fileType === "image";
            const isPdf = file.fileType === "pdf";
            const isVid = file.fileType === "video";
            const isWhiteboard = file.fileName.toLowerCase().includes("whiteboard") || file.fileName.toLowerCase().includes("drawing");

            return (
              <Paper
                key={file.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 1.5,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                {/* Header Tag / Channel & Direction */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                    <TagIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }} noWrap>
                      {file.chatName || "Workspace"}
                    </Typography>
                  </Box>

                  <Chip
                    label={file.isMe ? "Sent by you" : "Received"}
                    size="small"
                    color={file.isMe ? "primary" : "default"}
                    variant={file.isMe ? "filled" : "outlined"}
                    sx={{
                      fontSize: "10px",
                      height: 20,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                    }}
                  />
                </Box>

                {/* Preview Thumbnail / Type Box */}
                {isImg ? (
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      height: 150,
                      borderRadius: "8px",
                      overflow: "hidden",
                      bgcolor: "action.selected",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      component="img"
                      src={file.fileUrl}
                      alt={file.fileName}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    {isWhiteboard && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          bgcolor: "rgba(0,0,0,0.75)",
                          color: "#fff",
                          px: 1,
                          py: 0.25,
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <BrushIcon sx={{ fontSize: 12 }} />
                        <Typography sx={{ fontSize: "10px", fontWeight: 700 }}>Whiteboard</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: 120,
                      borderRadius: "8px",
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      color: isPdf ? "#f44336" : isVid ? "#9c27b0" : "primary.main",
                    }}
                  >
                    {isPdf ? (
                      <PictureAsPdfOutlinedIcon sx={{ fontSize: 42 }} />
                    ) : isVid ? (
                      <VideoLibraryOutlinedIcon sx={{ fontSize: 42 }} />
                    ) : (
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 42 }} />
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                      {file.fileType || "Document"}
                    </Typography>
                  </Box>
                )}

                {/* File Metadata & Sender */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "13.5px" }} noWrap title={file.fileName}>
                    {file.fileName}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75 }}>
                    <Avatar name={file.senderUsername} src={file.senderAvatarUrl} size={22} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.1 }} noWrap>
                        {file.senderUsername}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
                        {fmtDate(file.sentAt)} · {formatBytes(file.fileSize)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Tooltip title="Open in new tab">
                    <IconButton
                      component="a"
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Download file">
                    <IconButton
                      component="a"
                      href={file.fileUrl}
                      download={file.fileName}
                      size="small"
                      color="primary"
                      sx={{ border: "1px solid", borderColor: "primary.main", borderRadius: "8px" }}
                    >
                      <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
