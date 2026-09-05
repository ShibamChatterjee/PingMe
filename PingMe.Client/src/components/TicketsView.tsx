import { useState, useEffect } from "react";
import {
  Box, Typography, Button, Chip, Avatar, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Pagination,
  Menu, MenuItem, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChangeCircleOutlinedIcon from "@mui/icons-material/ChangeCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import {
  type Ticket, type TicketAttachment,
  type TicketDetail, type CreateTicketPayload, type UpdateTicketPayload,
  TicketStatus, TicketPriority, TicketCategory, ticketApi,
} from "../lib/api";
import type { OrgMember } from "../lib/orgStore";
import { TicketDetailView } from "./TicketDetailView";
import { CreateTicketView } from "./CreateTicketView";

const TextFieldAny = TextField as any;

// Priority and category configuration

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  [TicketPriority.Low]: { label: "Low", color: "#10b981", dot: "#10b981" },
  [TicketPriority.Medium]: { label: "Medium", color: "#f59e0b", dot: "#f59e0b" },
  [TicketPriority.High]: { label: "High", color: "#ef4444", dot: "#ef4444" },
  [TicketPriority.Critical]: { label: "Critical", color: "#a855f7", dot: "#a855f7" },
};

const CATEGORIES: TicketCategory[] = [
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusIcon({ status }: { status: TicketStatus | string }) {
  switch (status) {
    case TicketStatus.InProgress:
      return <ChangeCircleOutlinedIcon sx={{ fontSize: 17, color: "#f59e0b" }} />;
    case TicketStatus.Resolved:
      return <CheckCircleIcon sx={{ fontSize: 17, color: "#10b981" }} />;
    case TicketStatus.Closed:
      return <CancelOutlinedIcon sx={{ fontSize: 17, color: "#6b7280" }} />;
    default:
      return <RadioButtonUncheckedIcon sx={{ fontSize: 17, color: "#3b82f6" }} />;
  }
}

// Ticket list row item displaying summary and metadata

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.Medium;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, md: 2 },
        px: 3,
        py: 1.75,
        borderBottom: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        transition: "all 0.1s ease",
        "&:hover": {
          bgcolor: "action.hover",
          "& .ticket-title": {
            color: "primary.main",
          },
        },
      }}
    >
      {/* Status icon */}
      <Tooltip title={`Status: ${ticket.status}`}>
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <StatusIcon status={ticket.status} />
        </Box>
      </Tooltip>

      {/* Ticket Number Mono Badge */}
      <Typography
        sx={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "12px",
          color: "text.secondary",
          width: 80,
          flexShrink: 0,
        }}
      >
        {ticket.ticketNumber}
      </Typography>

      {/* Title & Attachment Flag */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          className="ticket-title"
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: "14px",
            color: "text.primary",
            transition: "color 0.1s ease",
          }}
          noWrap
        >
          {ticket.title}
        </Typography>

        {((ticket.attachmentCount ?? 0) > 0 || (ticket.attachments && ticket.attachments.length > 0)) && (
          <Tooltip title={`${ticket.attachmentCount || ticket.attachments?.length} attachment(s)`}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, color: "text.secondary", flexShrink: 0 }}>
              <AttachFileIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600 }}>
                {ticket.attachmentCount || ticket.attachments?.length}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Category Pill */}
      <Chip
        label={ticket.category}
        size="small"
        sx={{
          height: 22,
          fontSize: "11px",
          fontWeight: 600,
          borderRadius: "6px",
          bgcolor: "action.hover",
          color: "text.secondary",
          border: "1px solid",
          borderColor: "divider",
          display: { xs: "none", sm: "inline-flex" },
        }}
      />

      {/* Priority Indicator */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        gap: 0.75,
        width: 80,
        flexShrink: 0,
      }}>
        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: priorityCfg.dot }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "12px", color: priorityCfg.color }}>
          {priorityCfg.label}
        </Typography>
      </Box>

      {/* Assignee Avatar */}
      <Box sx={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        {ticket.assignedTo ? (
          <Tooltip title={`Assigned to ${ticket.assignedToUsername}`}>
            <Avatar
              src={ticket.assignedToAvatarUrl}
              sx={{ width: 24, height: 24, fontSize: "11px", fontWeight: 700 }}
            >
              {ticket.assignedToUsername?.[0]?.toUpperCase()}
            </Avatar>
          </Tooltip>
        ) : (
          <Tooltip title="Unassigned">
            <Box sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "1px dashed",
              borderColor: "text.disabled",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.disabled",
            }}>
              <PersonOutlineIcon sx={{ fontSize: 13 }} />
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Comment count */}
      <Box sx={{ width: 35, display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {ticket.commentCount > 0 ? (
          <>
            <ChatBubbleOutlineIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600, color: "text.secondary" }}>
              {ticket.commentCount}
            </Typography>
          </>
        ) : (
          <Box sx={{ width: 10 }} />
        )}
      </Box>

      {/* Date */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          width: 85,
          textAlign: "right",
          fontSize: "12px",
          display: { xs: "none", sm: "block" },
          flexShrink: 0,
        }}
      >
        {fmtDate(ticket.createdAt)}
      </Typography>
    </Box>
  );
}

// Main ticket management view

type SubView = "list" | "detail" | "create";

interface Props {
  orgId?: string;
  token?: string;
  members: OrgMember[];
  myUserId: string;
  myRole: string;
  tickets: Ticket[];
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  activeTicket: TicketDetail | null;
  loadingTicket: boolean;
  onLoadTickets: (params?: any) => void;
  onGetTicketDetail: (id: string) => void;
  onCreateTicket: (payload: CreateTicketPayload) => Promise<TicketDetail>;
  onUpdateTicket: (id: string, payload: UpdateTicketPayload) => Promise<any>;
  onDeleteTicket: (id: string) => Promise<any>;
  onAddComment: (id: string, content: string, attachments?: TicketAttachment[]) => Promise<any>;
  onAddAttachment?: (id: string, attachment: TicketAttachment) => Promise<any>;
  initialTicketId?: string | null;
}

export function TicketsView({
  orgId, token, members, myUserId, myRole,
  tickets, totalPages, currentPage, loading, error, activeTicket, loadingTicket,
  onLoadTickets, onGetTicketDetail, onCreateTicket, onUpdateTicket, onDeleteTicket, onAddComment, onAddAttachment,
  initialTicketId,
}: Props) {
  const [subView, setSubView] = useState<SubView>(initialTicketId ? "detail" : "list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);

  // Filter menu anchors
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState<null | HTMLElement>(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<null | HTMLElement>(null);

  // Load on mount + filter change
  useEffect(() => {
    onLoadTickets({
      page: 1,
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      createdBy: myTicketsOnly ? myUserId : undefined,
    });
  }, [search, statusFilter, priorityFilter, categoryFilter, myTicketsOnly]);

  // Navigate to initial ticket from chat link
  useEffect(() => {
    if (initialTicketId) {
      onGetTicketDetail(initialTicketId);
      setSubView("detail");
    }
  }, [initialTicketId]);

  // If activeTicket is present and matches initialTicketId, ensure detail view is shown
  useEffect(() => {
    if (activeTicket && initialTicketId === activeTicket.id) {
      setSubView("detail");
    }
  }, [activeTicket, initialTicketId]);

  const handleOpenTicketByNumber = async (ticketNumber: string) => {
    if (!token || !orgId) return;
    const cleanNum = ticketNumber.replace(/^#/, "").trim();
    try {
      const detail = await ticketApi.getByNumber(token, orgId, cleanNum);
      if (detail) {
        await onGetTicketDetail(detail.id);
        setSubView("detail");
      }
    } catch {
      // Ignored if not found
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    onGetTicketDetail(ticket.id);
    setSubView("detail");
  };

  const handleCreate = async (payload: CreateTicketPayload) => {
    await onCreateTicket(payload);
    setSubView("detail");
  };

  const handlePageChange = (_: any, page: number) => {
    onLoadTickets({
      page,
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      createdBy: myTicketsOnly ? myUserId : undefined,
    });
  };

  if (subView === "create") {
    return (
      <CreateTicketView
        members={members}
        myUserId={myUserId}
        token={token}
        orgId={orgId}
        onSubmit={handleCreate}
        onBack={() => setSubView("list")}
      />
    );
  }

  if (subView === "detail" && activeTicket) {
    return (
      <TicketDetailView
        ticket={activeTicket}
        loading={loadingTicket}
        members={members}
        myUserId={myUserId}
        myRole={myRole}
        token={token}
        orgId={orgId}
        onBack={() => { setSubView("list"); onLoadTickets(); }}
        onUpdate={onUpdateTicket}
        onDelete={onDeleteTicket}
        onAddComment={onAddComment}
        onAddAttachment={onAddAttachment}
        onOpenTicket={handleOpenTicketByNumber}
      />
    );
  }

  if (subView === "detail" && loadingTicket) {
    return (
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        width: "100%",
        height: "100%",
        p: 4,
        bgcolor: "background.default",
      }}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 2 }} />
      </Box>
    );
  }

  // Tickets list table and filter controls

  const statusPills = [
    { key: "", label: "All" },
    { key: "Open", label: "Open" },
    { key: "InProgress", label: "In Progress" },
    { key: "Resolved", label: "Resolved" },
    { key: "Closed", label: "Closed" },
  ];

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
      {/* Header toolbar */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
            Tickets
          </Typography>
          <Chip
            label={`${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"}`}
            size="small"
            sx={{ fontWeight: 700, fontSize: "11px", height: 22, borderRadius: "10px" }}
          />
        </Box>

        {/* Right action: + New Ticket */}
        <Button
          variant="contained"
          color="primary"
          onClick={() => setSubView("create")}
          startIcon={<AddIcon />}
          sx={{
            fontWeight: 700,
            textTransform: "none",
            borderRadius: "8px",
            px: 2,
            py: 0.7,
            boxShadow: "none",
          }}
        >
          New Ticket
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        px: 3,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Status Filter Tabs */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {statusPills.map((p) => {
            const active = statusFilter === p.key;
            return (
              <Button
                key={p.key}
                size="small"
                onClick={() => setStatusFilter(p.key)}
                sx={{
                  textTransform: "none",
                  fontWeight: active ? 700 : 500,
                  fontSize: "12.5px",
                  borderRadius: "20px",
                  px: 1.75,
                  py: 0.4,
                  bgcolor: active ? "action.selected" : "transparent",
                  color: active ? "text.primary" : "text.secondary",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "divider",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                {p.label}
              </Button>
            );
          })}

          {/* My tickets toggle */}
          <Button
            size="small"
            onClick={() => setMyTicketsOnly(!myTicketsOnly)}
            sx={{
              textTransform: "none",
              fontWeight: myTicketsOnly ? 700 : 500,
              fontSize: "12.5px",
              borderRadius: "20px",
              px: 1.5,
              py: 0.4,
              bgcolor: myTicketsOnly ? "primary.main" : "transparent",
              color: myTicketsOnly ? "primary.contrastText" : "text.secondary",
              border: "1px solid",
              borderColor: myTicketsOnly ? "primary.main" : "divider",
              "&:hover": {
                bgcolor: myTicketsOnly ? "primary.dark" : "action.hover",
              },
            }}
          >
            Assigned to me
          </Button>
        </Box>

        {/* Search & Property Filters */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Priority filter */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setPriorityMenuAnchor(e.currentTarget)}
            startIcon={<FilterListIcon sx={{ fontSize: 15 }} />}
            sx={{
              textTransform: "none",
              fontSize: "12px",
              borderRadius: "8px",
              borderColor: priorityFilter ? "primary.main" : "divider",
              color: priorityFilter ? "primary.main" : "text.secondary",
            }}
          >
            {priorityFilter ? `Priority: ${priorityFilter}` : "Priority"}
          </Button>
          <Menu
            anchorEl={priorityMenuAnchor}
            open={Boolean(priorityMenuAnchor)}
            onClose={() => setPriorityMenuAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: "10px" } } }}
          >
            <MenuItem onClick={() => { setPriorityFilter(""); setPriorityMenuAnchor(null); }} sx={{ fontSize: "12.5px" }}>
              All Priorities
            </MenuItem>
            {["Low", "Medium", "High", "Critical"].map((p) => (
              <MenuItem key={p} onClick={() => { setPriorityFilter(p); setPriorityMenuAnchor(null); }} sx={{ fontSize: "12.5px" }}>
                {p}
              </MenuItem>
            ))}
          </Menu>

          {/* Category filter */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setCategoryMenuAnchor(e.currentTarget)}
            sx={{
              textTransform: "none",
              fontSize: "12px",
              borderRadius: "8px",
              borderColor: categoryFilter ? "primary.main" : "divider",
              color: categoryFilter ? "primary.main" : "text.secondary",
            }}
          >
            {categoryFilter ? `Category: ${categoryFilter}` : "Category"}
          </Button>
          <Menu
            anchorEl={categoryMenuAnchor}
            open={Boolean(categoryMenuAnchor)}
            onClose={() => setCategoryMenuAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: "10px" } } }}
          >
            <MenuItem onClick={() => { setCategoryFilter(""); setCategoryMenuAnchor(null); }} sx={{ fontSize: "12.5px" }}>
              All Categories
            </MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} onClick={() => { setCategoryFilter(c); setCategoryMenuAnchor(null); }} sx={{ fontSize: "12.5px" }}>
                {c}
              </MenuItem>
            ))}
          </Menu>

          {/* Search box */}
          <TextFieldAny
            size="small"
            placeholder="Filter by title or keyword…"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              width: 240,
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: "12.5px" },
            }}
          />
        </Box>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}

      {/* Tickets List View */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
        {loading ? (
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: "8px" }} />
            ))}
          </Box>
        ) : tickets.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10, px: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
              No tickets found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
              {search || statusFilter || priorityFilter || categoryFilter || myTicketsOnly
                ? "No tickets match your active filter criteria. Try clearing some filters."
                : "No tickets have been created in this workspace yet. Create one to start tracking issues."}
            </Typography>
            <Button
              variant="contained"
              onClick={() => setSubView("create")}
              startIcon={<AddIcon />}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
            >
              Create First Ticket
            </Button>
          </Box>
        ) : (
          <Box>
            {tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                onClick={() => handleTicketClick(t)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <Box sx={{
          display: "flex",
          justifyContent: "center",
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  );
}
