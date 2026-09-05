import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Fab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityIcon from "@mui/icons-material/Security";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import TagIcon from "@mui/icons-material/Tag";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HistoryIcon from "@mui/icons-material/History";
import ClearIcon from "@mui/icons-material/Clear";

import { api, NoteType, type NoteDto, type OrganizationResponseDto } from "../lib/api";
import { getCanonicalRole } from "../lib/permissions";
import { fmtDate, fmtTime } from "../lib/utils";

const TextFieldAny = TextField as any;

interface Props {
  org: OrganizationResponseDto;
  myRole: string;
  authToken?: string | null;
}

const PAGE_SIZE = 20;

export function ActivityView({ org, myRole, authToken }: Props) {
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Scroll container and button visibility
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const isOwner = getCanonicalRole(myRole) === "Owner";

  // Fetch audit notes
  const fetchNotes = useCallback(
    async (pageToFetch: number, append: boolean = false) => {
      if (!authToken || !isOwner || !org?.id) return;

      if (pageToFetch === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const typeNum = selectedType === "all" ? undefined : Number(selectedType);
        const res = await api.notes.getNotes(authToken, org.id, {
          page: pageToFetch,
          pageSize: PAGE_SIZE,
          type: typeNum,
          search: searchQuery.trim() || undefined,
        });

        const newItems = res.items || [];
        setPage(pageToFetch);

        if (append) {
          setNotes((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const filteredNew = newItems.filter((n) => !existingIds.has(n.id));
            return [...prev, ...filteredNew];
          });
        } else {
          setNotes(newItems);
        }

        const totalPages = Math.ceil((res.totalCount || 0) / PAGE_SIZE);
        setHasMore(pageToFetch < totalPages);
      } catch (err: any) {
        setError(err?.message || "Failed to load audit history.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [authToken, isOwner, org?.id, selectedType, searchQuery]
  );

  // Initial & filter change load
  useEffect(() => {
    if (isOwner && authToken && org.id) {
      setPage(1);
      fetchNotes(1, false);
    }
  }, [fetchNotes, isOwner, authToken, org.id]);

  // Infinite Scroll Handler on the inner timeline container
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;

    setShowScrollTop(scrollTop > 200);
    setShowScrollBottom(scrollTop < scrollHeight - clientHeight - 200);

    // Auto-fetch next page when 150px from bottom
    if (scrollHeight - scrollTop - clientHeight < 150) {
      if (!loading && !loadingMore && hasMore) {
        fetchNotes(page + 1, true);
      }
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Group events by Date header
  const groupedEvents = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    const groups: Array<{ label: string; items: NoteDto[] }> = [];
    const map = new Map<string, NoteDto[]>();

    for (const item of sorted) {
      const dateKey = fmtDate(item.date);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
        groups.push({ label: dateKey, items: map.get(dateKey)! });
      }
      map.get(dateKey)!.push(item);
    }

    return groups;
  }, [notes, sortOrder]);

  const getEventMeta = (type: number) => {
    switch (type) {
      case NoteType.Org:
        return {
          label: "Organization",
          icon: <BusinessIcon sx={{ fontSize: 15 }} />,
          color: "#9333ea",
          bg: "rgba(147, 51, 234, 0.12)",
        };
      case NoteType.Role:
      case NoteType.Permission:
        return {
          label: "Roles & Permissions",
          icon: <VpnKeyIcon sx={{ fontSize: 15 }} />,
          color: "#d97706",
          bg: "rgba(217, 119, 6, 0.12)",
        };
      case NoteType.Member:
      case NoteType.User:
        return {
          label: "Member",
          icon: <PersonIcon sx={{ fontSize: 15 }} />,
          color: "#0891b2",
          bg: "rgba(8, 145, 178, 0.12)",
        };
      case NoteType.Group:
        return {
          label: "Channel",
          icon: <TagIcon sx={{ fontSize: 15 }} />,
          color: "#2563eb",
          bg: "rgba(37, 99, 235, 0.12)",
        };
      case NoteType.Invitation:
        return {
          label: "Invitation",
          icon: <EmailOutlinedIcon sx={{ fontSize: 15 }} />,
          color: "#059669",
          bg: "rgba(5, 150, 105, 0.12)",
        };
      case NoteType.Security:
        return {
          label: "Security",
          icon: <LockOutlinedIcon sx={{ fontSize: 15 }} />,
          color: "#dc2626",
          bg: "rgba(220, 38, 38, 0.12)",
        };
      default:
        return {
          label: "Activity",
          icon: <HistoryIcon sx={{ fontSize: 15 }} />,
          color: "#64748b",
          bg: "rgba(100, 116, 139, 0.12)",
        };
    }
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflow: "hidden",
        position: "relative",
        p: { xs: 2.5, md: 4 },
      }}
    >
      {/* Top Header Banner (Fixed at Top) */}
      <Box
        sx={{
          mb: 2.5,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          flexShrink: 0,
        }}
      >
        <div>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HistoryIcon sx={{ fontSize: 24, color: "primary.main" }} />
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.015em", color: "text.primary" }}>
              Organization Audit Trail
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Immutable chronological log of all administrative actions, membership shifts, and security events in {org.name}.
          </Typography>
        </div>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Scroll to Top">
            <IconButton
              size="small"
              onClick={scrollToTop}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}
            >
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Scroll to Bottom">
            <IconButton
              size="small"
              onClick={scrollToBottom}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px" }}
            >
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setPage(1);
              fetchNotes(1, false);
            }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", height: 34 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {!isOwner ? (
        <Alert severity="error" icon={<SecurityIcon />} sx={{ maxWidth: 600, borderRadius: "10px" }}>
          Access Denied: Only the Organization Owner can access the workspace audit trail.
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, overflow: "hidden", gap: 2 }}>
          {/* Search and Filters Bar (Single Clean Horizontal Line, Fixed at Top) */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: "12px",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: { xs: "wrap", md: "nowrap" },
              flexShrink: 0,
            }}
          >
            {/* Big Search Input */}
            <TextFieldAny
              placeholder="Search audit history by user, channel, action…"
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchNotes(1, false);
                }
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                style: { fontSize: "0.85rem", borderRadius: 8, height: 38 },
              }}
              sx={{ flexGrow: 1, minWidth: { xs: "100%", sm: 280 } }}
            />

            {/* Event Type Dropdown */}
            <FormControl size="small" sx={{ minWidth: 170, flexShrink: 0 }}>
              <InputLabel id="event-type-filter-label" sx={{ fontSize: "13px" }}>
                Event Type
              </InputLabel>
              <Select
                labelId="event-type-filter-label"
                value={selectedType}
                label="Event Type"
                onChange={(e) => setSelectedType(e.target.value)}
                renderValue={(selected) => {
                  switch (selected) {
                    case String(NoteType.Org): return "Organization";
                    case String(NoteType.Role): return "Roles & Permissions";
                    case String(NoteType.Member): return "Members";
                    case String(NoteType.Group): return "Channels";
                    case String(NoteType.Invitation): return "Invitations";
                    case String(NoteType.Security): return "Security";
                    default: return "All Events";
                  }
                }}
                sx={{ fontSize: "13px", borderRadius: "8px", height: 38 }}
              >
                <MenuItem value="all">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HistoryIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <span>All Events</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Org)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon sx={{ fontSize: 16, color: "#9333ea" }} />
                    <span>Organization</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Role)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <VpnKeyIcon sx={{ fontSize: 16, color: "#d97706" }} />
                    <span>Roles & Permissions</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Member)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: "#0891b2" }} />
                    <span>Members</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Group)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TagIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                    <span>Channels</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Invitation)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EmailOutlinedIcon sx={{ fontSize: 16, color: "#059669" }} />
                    <span>Invitations</span>
                  </Box>
                </MenuItem>
                <MenuItem value={String(NoteType.Security)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockOutlinedIcon sx={{ fontSize: 16, color: "#dc2626" }} />
                    <span>Security</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Sort Order Dropdown */}
            <FormControl size="small" sx={{ minWidth: 140, flexShrink: 0 }}>
              <InputLabel id="sort-order-label" sx={{ fontSize: "13px" }}>
                Sort Order
              </InputLabel>
              <Select
                labelId="sort-order-label"
                value={sortOrder}
                label="Sort Order"
                onChange={(e) => setSortOrder(e.target.value as any)}
                sx={{ fontSize: "13px", borderRadius: "8px", height: 38 }}
              >
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          {error && <Alert severity="error" sx={{ borderRadius: "10px", flexShrink: 0 }}>{error}</Alert>}

          {/* Scrollable Timeline Stream Container (Only this section scrolls) */}
          <Box
            ref={scrollContainerRef}
            onScroll={handleScroll}
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
                width: 0,
                height: 0,
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 2 }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary">
                  Loading audit trail history…
                </Typography>
              </Box>
            ) : notes.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: "12px", bgcolor: "background.paper" }}>
                <HistoryIcon sx={{ fontSize: 44, color: "text.secondary", mb: 1.5, opacity: 0.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  No audit events found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {searchQuery || selectedType !== "all"
                    ? "Try clearing your search query or selecting 'All Events' to see full activity."
                    : "All administrative changes, role updates, and invites will automatically be recorded here."}
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: 4 }}>
                {groupedEvents.map((group) => (
                  <Box key={group.label} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {/* Date Header Pill */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 1 }}>
                      <Chip
                        label={group.label}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "11.5px",
                          letterSpacing: "0.02em",
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      />
                      <Box sx={{ flexGrow: 1, height: "1px", bgcolor: "divider" }} />
                    </Box>

                    {/* MUI Timeline without side gap, time shown inside the card box */}
                    <Timeline
                      sx={{
                        p: 0,
                        m: 0,
                        "& .MuiTimelineItem-root:before": {
                          display: "none",
                        },
                      }}
                    >
                      {group.items.map((item, itemIdx) => {
                        const meta = getEventMeta(item.type);
                        const isLast = itemIdx === group.items.length - 1;

                        return (
                          <TimelineItem key={item.id} sx={{ minHeight: 64 }}>
                            <TimelineSeparator>
                              <TimelineDot
                                sx={{
                                  bgcolor: meta.bg,
                                  color: meta.color,
                                  border: `1.5px solid ${meta.color}`,
                                  p: 0.6,
                                  m: 0.5,
                                  boxShadow: "none",
                                }}
                              >
                                {meta.icon}
                              </TimelineDot>
                              {!isLast && <TimelineConnector sx={{ bgcolor: "divider" }} />}
                            </TimelineSeparator>

                            <TimelineContent sx={{ py: 0.5, px: 2, pr: 0 }}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.75,
                                  borderRadius: "10px",
                                  bgcolor: "background.paper",
                                  borderColor: "divider",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.75,
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    borderColor: meta.color,
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                                    bgcolor: "action.hover",
                                  },
                                }}
                              >
                                {/* Top row inside box: Type badge + Date & Time after it */}
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Chip
                                      label={meta.label}
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: "10.5px",
                                        fontWeight: 800,
                                        bgcolor: meta.bg,
                                        color: meta.color,
                                        border: `1px solid ${meta.color}33`,
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11.5px", fontWeight: 600 }}>
                                      {fmtDate(item.date)} at {fmtTime(item.date)}
                                    </Typography>
                                  </Box>
                                </Box>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: "text.primary",
                                    fontSize: "13.5px",
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {item.description}
                                </Typography>
                              </Paper>
                            </TimelineContent>
                          </TimelineItem>
                        );
                      })}
                    </Timeline>
                  </Box>
                ))}

                {/* Infinite Scroll Indicator / Load More */}
                {loadingMore ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3, alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={20} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Loading older audit records…
                    </Typography>
                  </Box>
                ) : hasMore ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => fetchNotes(page + 1, true)}
                      sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px" }}
                    >
                      Load More History ↓
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center", py: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      ✓ You have reached the beginning of the audit trail.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Floating Scroll Jump Buttons */}
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          zIndex: 20,
        }}
      >
        {showScrollTop && (
          <Tooltip title="Scroll to Top" placement="left">
            <Fab
              size="small"
              color="primary"
              onClick={scrollToTop}
              sx={{ boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
            >
              <ArrowUpwardIcon sx={{ fontSize: 18 }} />
            </Fab>
          </Tooltip>
        )}

        {showScrollBottom && (
          <Tooltip title="Scroll to Bottom" placement="left">
            <Fab
              size="small"
              color="default"
              onClick={scrollToBottom}
              sx={{ boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
            >
              <ArrowDownwardIcon sx={{ fontSize: 18 }} />
            </Fab>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
