import React, { useState, useRef } from "react";
import {
  Box, Typography, Button, Chip, Avatar, Divider, TextField,
  MenuItem, Menu, CircularProgress, Alert, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HistoryIcon from "@mui/icons-material/History";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChangeCircleOutlinedIcon from "@mui/icons-material/ChangeCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import {
  type TicketDetail, type TicketAttachment, type UpdateTicketPayload,
  TicketStatus, TicketPriority, TicketCategory, api,
} from "../lib/api";
import type { OrgMember } from "../lib/orgStore";
import { FormattedMessage } from "./FormattedMessage";

const TextFieldAny = TextField as any;

// Status and priority visual configuration

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  [TicketStatus.Open]: { label: "Open", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.12)", dot: "#3b82f6" },
  [TicketStatus.InProgress]: { label: "In Progress", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.12)", dot: "#f59e0b" },
  [TicketStatus.Resolved]: { label: "Resolved", color: "#34d399", bg: "rgba(16, 185, 129, 0.12)", dot: "#10b981" },
  [TicketStatus.Closed]: { label: "Closed", color: "#9ca3af", bg: "rgba(156, 163, 175, 0.12)", dot: "#6b7280" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  [TicketPriority.Low]: { label: "Low", color: "#10b981", dot: "#10b981" },
  [TicketPriority.Medium]: { label: "Medium", color: "#f59e0b", dot: "#f59e0b" },
  [TicketPriority.High]: { label: "High", color: "#ef4444", dot: "#ef4444" },
  [TicketPriority.Critical]: { label: "Critical", color: "#a855f7", dot: "#a855f7" },
};

const ALL_STATUSES: TicketStatus[] = [
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.Resolved,
  TicketStatus.Closed,
];

const ALL_PRIORITIES: TicketPriority[] = [
  TicketPriority.Low,
  TicketPriority.Medium,
  TicketPriority.High,
  TicketPriority.Critical,
];

const ALL_CATEGORIES: TicketCategory[] = [
  TicketCategory.General,
  TicketCategory.Bug,
  TicketCategory.Feature,
  TicketCategory.Technical,
  TicketCategory.Question,
  TicketCategory.Other,
];

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageFile(type?: string, url?: string) {
  if (type && type.startsWith("image/")) return true;
  if (url && /\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return true;
  return false;
}

function StatusIcon({ status }: { status: TicketStatus }) {
  switch (status) {
    case TicketStatus.InProgress:
      return <ChangeCircleOutlinedIcon sx={{ fontSize: 16, color: "#f59e0b" }} />;
    case TicketStatus.Resolved:
      return <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: "#10b981" }} />;
    case TicketStatus.Closed:
      return <CancelOutlinedIcon sx={{ fontSize: 16, color: "#6b7280" }} />;
    default:
      return <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: "#3b82f6" }} />;
  }
}

// Attachment card displaying thumbnail, file details, and download action

function AttachmentCard({
  att,
  onImageClick,
}: {
  att: TicketAttachment;
  onImageClick?: (url: string) => void;
}) {
  const isImg = isImageFile(att.fileType, att.fileUrl);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.25,
        borderRadius: "10px",
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
        transition: "all 0.15s ease",
        "&:hover": {
          bgcolor: "action.selected",
          borderColor: "primary.main",
        },
      }}
    >
      {isImg ? (
        <Box
          component="img"
          src={att.fileUrl}
          alt={att.fileName}
          onClick={() => onImageClick?.(att.fileUrl)}
          sx={{
            width: 44,
            height: 44,
            borderRadius: "6px",
            objectFit: "cover",
            cursor: "pointer",
            flexShrink: 0,
            bgcolor: "background.paper",
          }}
        />
      ) : (
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "6px",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "text.secondary",
          }}
        >
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 24 }} />
        </Box>
      )}

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: "13px" }}
          noWrap
          title={att.fileName}
        >
          {att.fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
          {fmtFileSize(att.fileSize)}
        </Typography>
      </Box>

      <Tooltip title="Download file">
        <IconButton
          size="small"
          onClick={() => window.open(att.fileUrl, "_blank")}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
        >
          <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// Ticket detail view component

interface Props {
  ticket: TicketDetail;
  loading?: boolean;
  members: OrgMember[];
  myUserId: string;
  myRole: string;
  token?: string;
  orgId?: string;
  onBack: () => void;
  onUpdate: (ticketId: string, payload: UpdateTicketPayload) => Promise<any>;
  onDelete: (ticketId: string) => Promise<any>;
  onAddComment: (ticketId: string, content: string, attachments?: TicketAttachment[]) => Promise<any>;
  onAddAttachment?: (ticketId: string, attachment: TicketAttachment) => Promise<any>;
  onOpenTicket?: (ticketNumber: string) => void;
}

export function TicketDetailView({
  ticket, loading, members, myUserId, myRole, token, orgId,
  onBack, onUpdate, onDelete, onAddComment, onAddAttachment, onOpenTicket,
}: Props) {
  // Tabs for the side panel (Comments vs Activity)
  const [sideTab, setSideTab] = useState<"comments" | "activity">("comments");

  // Comment state
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<TicketAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Edit title & description states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(ticket.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(ticket.description);
  const [savingEdit, setSavingEdit] = useState(false);

  // Dialogs & errors
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Anchor states for property dropdowns
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [priorityAnchor, setPriorityAnchor] = useState<null | HTMLElement>(null);
  const [categoryAnchor, setCategoryAnchor] = useState<null | HTMLElement>(null);
  const [assigneeAnchor, setAssigneeAnchor] = useState<null | HTMLElement>(null);

  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  const isAdminOrOwner = myRole === "Owner" || myRole === "Manager" || myRole === "owner" || myRole === "manager";
  const isCreator = ticket?.createdBy === myUserId;
  const canAdmin = isAdminOrOwner;
  const canChangeStatus = isAdminOrOwner || isCreator;
  const canEditTicket = isAdminOrOwner || isCreator;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1, height: "100%" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG[TicketStatus.Open];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG[TicketPriority.Medium];

  const handleStatusSelect = async (newStatus: TicketStatus) => {
    setStatusAnchor(null);
    if (newStatus === ticket.status) return;
    try {
      await onUpdate(ticket.id, { status: newStatus });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handlePrioritySelect = async (newPriority: TicketPriority) => {
    setPriorityAnchor(null);
    if (newPriority === ticket.priority) return;
    try {
      await onUpdate(ticket.id, { priority: newPriority });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleCategorySelect = async (newCategory: TicketCategory) => {
    setCategoryAnchor(null);
    if (newCategory === ticket.category) return;
    try {
      await onUpdate(ticket.id, { category: newCategory });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleAssigneeSelect = async (member: OrgMember | null) => {
    setAssigneeAnchor(null);
    try {
      await onUpdate(ticket.id, { assignedTo: member?.userId ?? "" });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === ticket.title) {
      setIsEditingTitle(false);
      setEditedTitle(ticket.title);
      return;
    }
    setSavingEdit(true);
    try {
      await onUpdate(ticket.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveDescription = async () => {
    if (editedDesc === ticket.description) {
      setIsEditingDesc(false);
      return;
    }
    setSavingEdit(true);
    try {
      await onUpdate(ticket.id, { description: editedDesc.trim() });
      setIsEditingDesc(false);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTicketFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;
    setUploadingFiles(true);
    setActionError(null);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await api.uploadFile(token, file, orgId);
        if (onAddAttachment) {
          await onAddAttachment(ticket.id, {
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            fileType: uploaded.fileType,
            fileSize: uploaded.fileSize,
          });
        }
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to upload file");
    } finally {
      setUploadingFiles(false);
      if (ticketFileInputRef.current) ticketFileInputRef.current.value = "";
    }
  };

  const handleCommentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;
    setUploadingFiles(true);
    setActionError(null);
    try {
      const uploadedList: TicketAttachment[] = [];
      for (const file of Array.from(files)) {
        const res = await api.uploadFile(token, file, orgId);
        uploadedList.push({
          fileName: res.fileName,
          fileUrl: res.fileUrl,
          fileType: res.fileType,
          fileSize: res.fileSize,
        });
      }
      setCommentFiles((prev) => [...prev, ...uploadedList]);
    } catch (err: any) {
      setActionError(err.message || "Failed to upload file");
    } finally {
      setUploadingFiles(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() && commentFiles.length === 0) return;
    setSendingComment(true);
    setActionError(null);
    try {
      await onAddComment(ticket.id, comment.trim(), commentFiles.length > 0 ? commentFiles : undefined);
      setComment("");
      setCommentFiles([]);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(ticket.id);
      setDeleteDialogOpen(false);
      onBack();
    } catch (e: any) {
      setActionError(e.message);
      setDeleting(false);
    }
  };

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      width: "100%",
      height: "100%",
      minWidth: 0,
      overflow: "hidden",
      bgcolor: "background.default",
    }}>
      {/* Top navigation bar with ticket number, title, and quick actions */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Tooltip title="Back to tickets list">
            <IconButton size="small" onClick={onBack} sx={{ color: "text.secondary" }}>
              <ArrowBackIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>

          <Chip
            label={ticket.ticketNumber}
            size="small"
            sx={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "12px",
              bgcolor: "action.hover",
              color: "text.primary",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: "divider",
            }}
          />

          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, fontSize: "15px", color: "text.primary" }}
            noWrap
          >
            {ticket.title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Quick status toggle */}
          {canChangeStatus && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleStatusSelect(
                ticket.status === TicketStatus.Closed || ticket.status === TicketStatus.Resolved
                  ? TicketStatus.Open
                  : TicketStatus.Resolved
              )}
              startIcon={
                ticket.status === TicketStatus.Closed || ticket.status === TicketStatus.Resolved
                  ? <ReplayIcon sx={{ fontSize: 16 }} />
                  : <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
              }
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                borderRadius: "7px",
                py: 0.4,
                px: 1.5,
              }}
            >
              {ticket.status === TicketStatus.Closed || ticket.status === TicketStatus.Resolved
                ? "Reopen Ticket"
                : "Mark Resolved"}
            </Button>
          )}

          {canAdmin && (
            <Tooltip title="Delete ticket">
              <IconButton
                size="small"
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ color: "error.main", opacity: 0.8, "&:hover": { opacity: 1 } }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: 0 }}>
          {actionError}
        </Alert>
      )}

      {/* Main layout: Task details canvas on the left, discussion and activity on the right */}
      <Box sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        flexGrow: 1,
        minHeight: 0,
        overflow: "hidden",
      }}>

        {/* Left column: Task details, properties, description, and attachments */}
        <Box sx={{
          flexGrow: 1,
          minWidth: 0,
          overflowY: "auto",
          p: { xs: 2.5, md: 4 },
        }}>
          <Box sx={{ maxWidth: 960, mx: "auto" }}>

            {/* Title Section with Inline Edit */}
            <Box sx={{ mb: 2.5 }}>
              {isEditingTitle ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextFieldAny
                    fullWidth
                    size="small"
                    value={editedTitle}
                    onChange={(e: any) => setEditedTitle(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditedTitle(ticket.title);
                      }
                    }}
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "22px",
                        fontWeight: 800,
                        borderRadius: "8px",
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSaveTitle}
                    disabled={savingEdit}
                    size="small"
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(ticket.title);
                    }}
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: "-0.5px",
                      lineHeight: 1.25,
                      color: "text.primary",
                      fontSize: { xs: "22px", md: "28px" },
                    }}
                  >
                    {ticket.title}
                  </Typography>
                  {canEditTicket && (
                    <Tooltip title="Edit title">
                      <IconButton
                        size="small"
                        onClick={() => setIsEditingTitle(true)}
                        sx={{ color: "text.secondary", opacity: 0.6, "&:hover": { opacity: 1 } }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>

            {/* Properties bar: Status, priority, category, assignee, reporter, and dates */}
            <Box sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(6, 1fr)",
              },
              gap: 2,
              p: 2.5,
              mb: 3.5,
              borderRadius: "12px",
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
            }}>
              {/* Status */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Status
                </Typography>
                {canChangeStatus ? (
                  <>
                    <Box
                      onClick={(e) => setStatusAnchor(e.currentTarget)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "7px",
                        bgcolor: statusCfg.bg,
                        color: statusCfg.color,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "12px",
                        transition: "all 0.15s ease",
                        "&:hover": { opacity: 0.85 },
                      }}
                    >
                      <StatusIcon status={ticket.status} />
                      <span>{statusCfg.label}</span>
                      <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                    </Box>
                    <Menu
                      anchorEl={statusAnchor}
                      open={Boolean(statusAnchor)}
                      onClose={() => setStatusAnchor(null)}
                      slotProps={{ paper: { sx: { borderRadius: "10px", minWidth: 150 } } }}
                    >
                      {ALL_STATUSES.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <MenuItem key={s} onClick={() => handleStatusSelect(s)} sx={{ fontSize: "13px", gap: 1.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cfg.dot }} />
                            {cfg.label}
                          </MenuItem>
                        );
                      })}
                    </Menu>
                  </>
                ) : (
                  <Chip
                    icon={<StatusIcon status={ticket.status} />}
                    label={statusCfg.label}
                    size="small"
                    sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, borderRadius: "6px" }}
                  />
                )}
              </Box>

              {/* Priority */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Priority
                </Typography>
                {canAdmin ? (
                  <>
                    <Box
                      onClick={(e) => setPriorityAnchor(e.currentTarget)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "7px",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "12px",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: priorityCfg.dot }} />
                      <span>{priorityCfg.label}</span>
                      <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Box>
                    <Menu
                      anchorEl={priorityAnchor}
                      open={Boolean(priorityAnchor)}
                      onClose={() => setPriorityAnchor(null)}
                      slotProps={{ paper: { sx: { borderRadius: "10px", minWidth: 140 } } }}
                    >
                      {ALL_PRIORITIES.map((p) => {
                        const cfg = PRIORITY_CONFIG[p];
                        return (
                          <MenuItem key={p} onClick={() => handlePrioritySelect(p)} sx={{ fontSize: "13px", gap: 1.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cfg.dot }} />
                            {cfg.label}
                          </MenuItem>
                        );
                      })}
                    </Menu>
                  </>
                ) : (
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 1, py: 0.4 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: priorityCfg.dot }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px" }}>
                      {priorityCfg.label}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Category */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Category
                </Typography>
                {canEditTicket ? (
                  <>
                    <Box
                      onClick={(e) => setCategoryAnchor(e.currentTarget)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "7px",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "12px",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <span>{ticket.category}</span>
                      <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Box>
                    <Menu
                      anchorEl={categoryAnchor}
                      open={Boolean(categoryAnchor)}
                      onClose={() => setCategoryAnchor(null)}
                      slotProps={{ paper: { sx: { borderRadius: "10px", minWidth: 140 } } }}
                    >
                      {ALL_CATEGORIES.map((c) => (
                        <MenuItem key={c} onClick={() => handleCategorySelect(c)} sx={{ fontSize: "13px" }}>
                          {c}
                        </MenuItem>
                      ))}
                    </Menu>
                  </>
                ) : (
                  <Chip label={ticket.category} size="small" sx={{ fontWeight: 600, borderRadius: "6px" }} />
                )}
              </Box>

              {/* Assignee */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Assignee
                </Typography>
                {canAdmin ? (
                  <>
                    <Box
                      onClick={(e) => setAssigneeAnchor(e.currentTarget)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "7px",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        fontSize: "12px",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      {ticket.assignedTo ? (
                        <>
                          <Avatar src={ticket.assignedToAvatarUrl} sx={{ width: 18, height: 18, fontSize: "10px" }}>
                            {ticket.assignedToUsername?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12px" }} noWrap>
                            {ticket.assignedToUsername}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <PersonOutlineOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "12px" }}>
                            Unassigned
                          </Typography>
                        </>
                      )}
                      <KeyboardArrowDownIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Box>
                    <Menu
                      anchorEl={assigneeAnchor}
                      open={Boolean(assigneeAnchor)}
                      onClose={() => setAssigneeAnchor(null)}
                      slotProps={{ paper: { sx: { borderRadius: "10px", maxHeight: 280, minWidth: 200 } } }}
                    >
                      <MenuItem onClick={() => handleAssigneeSelect(null)} sx={{ fontSize: "13px", color: "text.secondary" }}>
                        Unassigned
                      </MenuItem>
                      {members.map((m) => (
                        <MenuItem key={m.userId} onClick={() => handleAssigneeSelect(m)} sx={{ fontSize: "13px", gap: 1.5 }}>
                          <Avatar src={m.avatarUrl} sx={{ width: 22, height: 22, fontSize: "11px" }}>
                            {m.username?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {m.username}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Menu>
                  </>
                ) : (
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, py: 0.4 }}>
                    {ticket.assignedTo ? (
                      <>
                        <Avatar src={ticket.assignedToAvatarUrl} sx={{ width: 18, height: 18, fontSize: "10px" }}>
                          {ticket.assignedToUsername?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12px" }}>
                          {ticket.assignedToUsername}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "12px" }}>
                        Unassigned
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              {/* Reporter */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Reporter
                </Typography>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, py: 0.4 }}>
                  <Avatar src={ticket.createdByAvatarUrl} sx={{ width: 18, height: 18, fontSize: "10px" }}>
                    {ticket.createdByUsername?.[0]?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12px" }} noWrap>
                    {ticket.createdByUsername}
                  </Typography>
                </Box>
              </Box>

              {/* Created Date */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
                  Created
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "12px", display: "block", py: 0.4 }}>
                  {fmtDate(ticket.createdAt)}
                </Typography>
              </Box>
            </Box>

            {/* Ticket description */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "text.secondary",
                    fontSize: "11px",
                  }}
                >
                  Description
                </Typography>
                {canEditTicket && !isEditingDesc && (
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => {
                      setEditedDesc(ticket.description);
                      setIsEditingDesc(true);
                    }}
                    sx={{ textTransform: "none", fontSize: "12px", color: "text.secondary" }}
                  >
                    Edit
                  </Button>
                )}
              </Box>

              {isEditingDesc ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <TextFieldAny
                    fullWidth
                    multiline
                    minRows={4}
                    value={editedDesc}
                    onChange={(e: any) => setEditedDesc(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        fontSize: "14.5px",
                        lineHeight: 1.7,
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsEditingDesc(false);
                        setEditedDesc(ticket.description);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveDescription}
                      disabled={savingEdit}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{
                  borderLeft: "3px solid",
                  borderColor: "primary.main",
                  pl: 2.5,
                  py: 0.5,
                }}>
                  {ticket.description ? (
                    <FormattedMessage content={ticket.description} onOpenTicket={onOpenTicket} />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "text.secondary",
                        fontSize: "14px",
                        fontStyle: "italic",
                      }}
                    >
                      No description provided.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3.5, opacity: 0.6 }} />

            {/* Attachments gallery with upload button */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AttachFileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography
                    variant="overline"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "text.secondary",
                      fontSize: "11px",
                    }}
                  >
                    Attachments ({ticket.attachments?.length || 0})
                  </Typography>
                </Box>

                {onAddAttachment && (
                  <>
                    <input
                      ref={ticketFileInputRef}
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleTicketFileUpload}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={uploadingFiles ? <CircularProgress size={14} /> : <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />}
                      onClick={() => ticketFileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      sx={{
                        textTransform: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "8px",
                      }}
                    >
                      {uploadingFiles ? "Uploading…" : "+ Attach file"}
                    </Button>
                  </>
                )}
              </Box>

              {ticket.attachments && ticket.attachments.length > 0 ? (
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 1.5,
                }}>
                  {ticket.attachments.map((att, idx) => (
                    <AttachmentCard
                      key={att.id || idx}
                      att={att}
                      onImageClick={(url) => setPreviewImageUrl(url)}
                    />
                  ))}
                </Box>
              ) : (
                <Box
                  onClick={() => ticketFileInputRef.current?.click()}
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: "10px",
                    p: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                  }}
                >
                  <CloudUploadOutlinedIcon sx={{ fontSize: 28, color: "text.secondary", mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px" }}>
                    No files attached yet. Click to upload screenshots, logs, or documents.
                  </Typography>
                </Box>
              )}
            </Box>

          </Box>
        </Box>

        {/* Right sidebar: Tabbed comments and activity audit trail */}
        <Box sx={{
          width: { xs: "100%", md: 400, lg: 420 },
          flexShrink: 0,
          borderLeft: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}>
          {/* Tab Switcher Header */}
          <Box sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            px: 2,
            pt: 0.75,
            bgcolor: "background.paper",
            flexShrink: 0,
          }}>
            <Tabs
              value={sideTab}
              onChange={(_, val) => setSideTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                minHeight: 44,
                "& .MuiTab-root": {
                  minHeight: 44,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "13px",
                  px: 2,
                  py: 1,
                },
              }}
            >
              <Tab
                value="comments"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                    <span>Comments</span>
                    <Chip
                      label={ticket.comments?.length || 0}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "11px",
                        fontWeight: 700,
                        px: 0.5,
                        bgcolor: sideTab === "comments" ? "primary.main" : "action.hover",
                        color: sideTab === "comments" ? "primary.contrastText" : "text.secondary",
                      }}
                    />
                  </Box>
                }
              />
              <Tab
                value="activity"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HistoryIcon sx={{ fontSize: 16 }} />
                    <span>Activity</span>
                    <Chip
                      label={ticket.activityLog?.length || 0}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "11px",
                        fontWeight: 700,
                        px: 0.5,
                        bgcolor: sideTab === "activity" ? "primary.main" : "action.hover",
                        color: sideTab === "activity" ? "primary.contrastText" : "text.secondary",
                      }}
                    />
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* Comments discussion stream and message composer */}
          {sideTab === "comments" && (
            <Box sx={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minHeight: 0,
              overflow: "hidden",
            }}>
              {/* Scrollable Comments List */}
              <Box sx={{
                flexGrow: 1,
                overflowY: "auto",
                p: 2.5,
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
              }}>
                {ticket.comments.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
                    <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      No comments yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Start the conversation below
                    </Typography>
                  </Box>
                ) : (
                  ticket.comments.map((c) => (
                    <Box key={c.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Avatar
                        src={c.authorAvatarUrl}
                        sx={{ width: 30, height: 30, fontSize: "12px", fontWeight: 700, bgcolor: "primary.dark", flexShrink: 0 }}
                      >
                        {c.authorUsername?.[0]?.toUpperCase()}
                      </Avatar>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px" }}>
                            {c.authorUsername}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
                            {fmtDate(c.createdAt)}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            color: "text.primary",
                            fontSize: "13.5px",
                            lineHeight: 1.55,
                            wordBreak: "break-word",
                          }}
                        >
                          <FormattedMessage content={c.content} onOpenTicket={onOpenTicket} />
                        </Box>

                        {/* Comment Attachments */}
                        {c.attachments && c.attachments.length > 0 && (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                            {c.attachments.map((att, idx) => (
                              <AttachmentCard
                                key={att.id || idx}
                                att={att}
                                onImageClick={(url) => setPreviewImageUrl(url)}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>

              {/* Pinned Bottom Comment Composer */}
              <Box sx={{
                p: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                flexShrink: 0,
              }}>
                {/* Staged Comment Attachments */}
                {commentFiles.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                    {commentFiles.map((f, i) => (
                      <Chip
                        key={i}
                        size="small"
                        icon={<AttachFileIcon sx={{ fontSize: 13 }} />}
                        label={f.fileName}
                        onDelete={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        sx={{ fontSize: "11.5px", borderRadius: "6px" }}
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "action.hover",
                  p: 1.25,
                  transition: "border-color 0.15s ease",
                  "&:focus-within": { borderColor: "primary.main", bgcolor: "background.paper" },
                }}>
                  <TextFieldAny
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={5}
                    placeholder="Write a comment... (Enter to send, Shift+Enter for newline)"
                    value={comment}
                    onChange={(e: any) => setComment(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    variant="standard"
                    InputProps={{ disableUnderline: true, sx: { fontSize: "13px" } }}
                  />

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, pt: 0.75, borderTop: "1px solid", borderColor: "divider" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <input
                        ref={commentFileInputRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={handleCommentFileUpload}
                      />
                      <Tooltip title="Attach files to comment">
                        <IconButton
                          size="small"
                          onClick={() => commentFileInputRef.current?.click()}
                          disabled={uploadingFiles}
                          sx={{ color: "text.secondary" }}
                        >
                          {uploadingFiles ? <CircularProgress size={14} /> : <AttachFileIcon sx={{ fontSize: 17 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSendComment}
                      disabled={sendingComment || (!comment.trim() && commentFiles.length === 0)}
                      endIcon={sendingComment ? <CircularProgress size={13} color="inherit" /> : <SendIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "12px",
                        borderRadius: "6px",
                        py: 0.4,
                        px: 1.5,
                      }}
                    >
                      Send
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Chronological activity log timeline */}
          {sideTab === "activity" && (
            <Box sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              {ticket.activityLog.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
                  <HistoryIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    No activity recorded yet
                  </Typography>
                </Box>
              ) : (
                ticket.activityLog.map((act) => (
                  <Box key={act.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                    <Avatar
                      src={act.actorAvatarUrl}
                      sx={{ width: 26, height: 26, fontSize: "11px", fontWeight: 700, bgcolor: "action.selected", flexShrink: 0 }}
                    >
                      {act.actorUsername?.[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontSize: "12.5px", color: "text.primary", lineHeight: 1.5 }}>
                        <strong>{act.actorUsername}</strong>{" "}
                        {act.eventType === "ticket_created" && (
                          <span>created this ticket</span>
                        )}
                        {act.eventType === "ticket_status_changed" && (
                          <span>
                            changed status from{" "}
                            <Chip label={act.oldValue} size="small" sx={{ height: 18, fontSize: "10.5px", px: 0.5 }} /> to{" "}
                            <Chip label={act.newValue} size="small" color="primary" sx={{ height: 18, fontSize: "10.5px", px: 0.5 }} />
                          </span>
                        )}
                        {act.eventType === "ticket_completed" && (
                          <span>marked ticket as <strong>{act.newValue}</strong></span>
                        )}
                        {act.eventType === "ticket_priority_changed" && (
                          <span>
                            changed priority to <strong>{act.newValue}</strong>
                          </span>
                        )}
                        {act.eventType === "ticket_assigned" && (
                          <span>
                            {act.newValue ? (
                              <>assigned to <strong>{act.newValue}</strong></>
                            ) : (
                              <>unassigned the ticket</>
                            )}
                          </span>
                        )}
                        {act.eventType === "ticket_comment_added" && (
                          <span>added a comment</span>
                        )}
                        {act.eventType === "ticket_attachment_added" && (
                          <span>attached a file</span>
                        )}
                        {act.eventType === "ticket_updated" && (
                          <span>updated the ticket</span>
                        )}
                      </Typography>

                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px", display: "block", mt: 0.25 }}>
                        {fmtDate(act.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Fullscreen image preview modal */}
      <Dialog
        open={Boolean(previewImageUrl)}
        onClose={() => setPreviewImageUrl(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", overflow: "hidden" } } }}
      >
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <IconButton
            onClick={() => setPreviewImageUrl(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
          {previewImageUrl && (
            <Box
              component="img"
              src={previewImageUrl}
              alt="Attachment preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "12px",
                objectFit: "contain",
              }}
            />
          )}
        </Box>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{ticket.ticketNumber}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {deleting ? "Deleting…" : "Delete Ticket"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
