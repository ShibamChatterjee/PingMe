import { useState, useRef } from "react";
import {
  Box, Typography, TextField, Button, Select, MenuItem,
  FormControl, CircularProgress, Alert, Avatar,
  IconButton, Tooltip, Menu,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import type { OrgMember } from "../lib/orgStore";
import {
  type CreateTicketPayload, type TicketAttachment,
  TicketPriority, TicketCategory, api,
} from "../lib/api";

const TextFieldAny = TextField as any;

const CATEGORIES: TicketCategory[] = [
  TicketCategory.General,
  TicketCategory.Bug,
  TicketCategory.Feature,
  TicketCategory.Technical,
  TicketCategory.Question,
  TicketCategory.Other,
];

const PRIORITIES: { value: TicketPriority; color: string; label: string }[] = [
  { value: TicketPriority.Low, color: "#10b981", label: "Low" },
  { value: TicketPriority.Medium, color: "#f59e0b", label: "Medium" },
  { value: TicketPriority.High, color: "#ef4444", label: "High" },
  { value: TicketPriority.Critical, color: "#a855f7", label: "Critical" },
];

function fmtFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageFile(type: string, url: string) {
  if (type && type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
}

interface Props {
  members: OrgMember[];
  myUserId?: string;
  token?: string;
  orgId?: string;
  onSubmit: (payload: CreateTicketPayload) => Promise<void>;
  onBack: () => void;
}

export function CreateTicketView({ members, myUserId: _myUserId, token, orgId, onSubmit, onBack }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.General);
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.Medium);
  const [assignee, setAssignee] = useState<OrgMember | null>(null);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Menu anchor states
  const [assigneeAnchor, setAssigneeAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;
    setUploadingFiles(true);
    setError(null);
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
      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        assignedTo: assignee?.userId || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } catch (e: any) {
      setError(e.message || "Failed to create ticket.");
      setSubmitting(false);
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
      {/* Top action header */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title="Cancel and go back">
            <IconButton size="small" onClick={onBack} sx={{ color: "text.secondary" }}>
              <ArrowBackIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "16px" }}>
            New Ticket
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            size="small"
            onClick={onBack}
            disabled={submitting}
            sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleSubmit}
            disabled={submitting || uploadingFiles || !title.trim() || !description.trim()}
            endIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "13px",
              px: 2.5,
              py: 0.7,
              borderRadius: "8px",
            }}
          >
            {submitting ? "Creating..." : "Create Ticket"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      {/* Editor Content Area */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", p: { xs: 2.5, md: 4 } }}>
        <Box sx={{ maxWidth: 840, mx: "auto" }}>

          {/* Properties Pill Row */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mb: 3,
            pb: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}>
            {/* Category Dropdown */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Category:
              </Typography>
              <FormControl size="small">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  sx={{
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    height: 32,
                    "& .MuiSelect-select": { py: 0.5, px: 1.5 },
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat} sx={{ fontSize: "13px" }}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Priority Dropdown */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Priority:
              </Typography>
              <FormControl size="small">
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  sx={{
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    height: 32,
                    "& .MuiSelect-select": { py: 0.5, px: 1.5, display: "flex", alignItems: "center", gap: 1 },
                  }}
                >
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p.value} value={p.value} sx={{ fontSize: "13px", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color }} />
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Assignee Selector Button */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Assignee:
              </Typography>
              <Box
                onClick={(e) => setAssigneeAnchor(e.currentTarget)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.4,
                  borderRadius: "8px",
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  height: 32,
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                {assignee ? (
                  <>
                    <Avatar src={assignee.avatarUrl} sx={{ width: 18, height: 18, fontSize: "10px" }}>
                      {assignee.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px" }}>
                      {assignee.username}
                    </Typography>
                  </>
                ) : (
                  <>
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "12.5px" }}>
                      Unassigned
                    </Typography>
                  </>
                )}
              </Box>

              <Menu
                anchorEl={assigneeAnchor}
                open={Boolean(assigneeAnchor)}
                onClose={() => setAssigneeAnchor(null)}
                slotProps={{ paper: { sx: { borderRadius: "10px", maxHeight: 280, minWidth: 180 } } }}
              >
                <MenuItem onClick={() => { setAssignee(null); setAssigneeAnchor(null); }} sx={{ fontSize: "13px", color: "text.secondary" }}>
                  Unassigned
                </MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.userId} onClick={() => { setAssignee(m); setAssigneeAnchor(null); }} sx={{ fontSize: "13px", gap: 1.5 }}>
                    <Avatar src={m.avatarUrl} sx={{ width: 22, height: 22, fontSize: "11px" }}>
                      {m.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {m.username}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>

          {/* Large Title Input (Clean Linear Style) */}
          <TextFieldAny
            fullWidth
            placeholder="Ticket title..."
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: { xs: "22px", md: "26px" },
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "text.primary",
                mb: 2,
              },
            }}
          />

          {/* Description Multiline Textarea */}
          <TextFieldAny
            fullWidth
            multiline
            minRows={7}
            placeholder="Add a detailed description, reproduction steps, or context..."
            value={description}
            onChange={(e: any) => setDescription(e.target.value)}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: "15px",
                lineHeight: 1.7,
                color: "text.primary",
                mb: 4,
              },
            }}
          />

          {/* Attachments Dropzone / List */}
          <Box sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 3,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AttachFileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "14px" }}>
                  Attachments ({attachments.length})
                </Typography>
              </Box>

              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              <Button
                size="small"
                variant="outlined"
                startIcon={uploadingFiles ? <CircularProgress size={14} /> : <AttachFileIcon sx={{ fontSize: 16 }} />}
                disabled={uploadingFiles}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: "none", fontWeight: 600, fontSize: "12px", borderRadius: "7px" }}
              >
                {uploadingFiles ? "Uploading…" : "+ Attach files"}
              </Button>
            </Box>

            {/* Attached file items */}
            {attachments.length > 0 ? (
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(220px, 1fr))" },
                gap: 1.5,
              }}>
                {attachments.map((att, i) => {
                  const isImg = isImageFile(att.fileType, att.fileUrl);
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.25,
                        borderRadius: "10px",
                        bgcolor: "action.hover",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {isImg ? (
                        <Box
                          component="img"
                          src={att.fileUrl}
                          alt={att.fileName}
                          sx={{ width: 40, height: 40, borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "6px",
                          bgcolor: "background.paper",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "text.secondary",
                        }}>
                          <InsertDriveFileOutlinedIcon sx={{ fontSize: 22 }} />
                        </Box>
                      )}

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px" }} noWrap title={att.fileName}>
                          {att.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
                          {fmtFileSize(att.fileSize)}
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: "12px",
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 28, color: "text.secondary", mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px", fontWeight: 500 }}>
                  Click to browse and upload screenshots, logs, or documents
                </Typography>
              </Box>
            )}
          </Box>

        </Box>
      </Box>
    </Box>
  );
}
