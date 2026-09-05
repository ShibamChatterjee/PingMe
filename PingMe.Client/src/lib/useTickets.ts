import { useState, useEffect, useCallback } from "react";
import { ticketApi, type Ticket, type TicketDetail, type TicketAttachment } from "./api";
import type { ChatHub } from "./hub";

interface UseTicketsOptions {
  token: string | null;
  orgId: string | null;
  hub: ChatHub | null;
}

export function useTickets({ token, orgId, hub }: UseTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const loadTickets = useCallback(async (params?: {
    page?: number; search?: string; status?: string;
    priority?: string; category?: string; assignedTo?: string;
    createdBy?: string; sortBy?: string;
  }) => {
    if (!token || !orgId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ticketApi.list(token, orgId, { pageSize: 20, ...params });
      setTickets(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setCurrentPage(result.page);
    } catch (e: any) {
      setError(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  const getTicketDetail = useCallback(async (ticketId: string) => {
    if (!token || !orgId) return;
    setLoadingTicket(true);
    try {
      const detail = await ticketApi.getById(token, orgId, ticketId);
      setActiveTicket(detail);
    } catch (e: any) {
      setError(e.message || "Failed to load ticket");
    } finally {
      setLoadingTicket(false);
    }
  }, [token, orgId]);

  const getTicketByNumber = useCallback(async (ticketNumber: string) => {
    if (!token || !orgId) return;
    setLoadingTicket(true);
    try {
      const detail = await ticketApi.getByNumber(token, orgId, ticketNumber);
      setActiveTicket(detail);
      return detail;
    } catch (e: any) {
      setError(e.message || "Ticket not found");
      return null;
    } finally {
      setLoadingTicket(false);
    }
  }, [token, orgId]);

  const createTicket = useCallback(async (payload: Parameters<typeof ticketApi.create>[2]) => {
    if (!token || !orgId) throw new Error("Not authenticated");
    const detail = await ticketApi.create(token, orgId, payload);
    setActiveTicket(detail);
    setTickets(prev => [detail, ...prev]);
    return detail;
  }, [token, orgId]);

  const updateTicket = useCallback(async (ticketId: string, payload: Parameters<typeof ticketApi.update>[3]) => {
    if (!token || !orgId) throw new Error("Not authenticated");
    const detail = await ticketApi.update(token, orgId, ticketId, payload);
    setActiveTicket(detail);
    setTickets(prev => prev.map(t => t.id === ticketId ? detail : t));
    return detail;
  }, [token, orgId]);

  const deleteTicket = useCallback(async (ticketId: string) => {
    if (!token || !orgId) throw new Error("Not authenticated");
    await ticketApi.delete(token, orgId, ticketId);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (activeTicket?.id === ticketId) setActiveTicket(null);
  }, [token, orgId, activeTicket]);

  const addComment = useCallback(async (ticketId: string, content: string, attachments?: TicketAttachment[]) => {
    if (!token || !orgId) throw new Error("Not authenticated");
    const detail = await ticketApi.addComment(token, orgId, ticketId, content, attachments);
    setActiveTicket(detail);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, commentCount: detail.commentCount } : t));
    return detail;
  }, [token, orgId]);

  const addAttachment = useCallback(async (ticketId: string, attachment: TicketAttachment) => {
    if (!token || !orgId) throw new Error("Not authenticated");
    const detail = await ticketApi.addAttachment(token, orgId, ticketId, attachment);
    setActiveTicket(detail);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, attachmentCount: (t.attachmentCount ?? 0) + 1 } : t));
    return detail;
  }, [token, orgId]);

  // Real-time SignalR updates
  useEffect(() => {
    if (!hub) return;
    const handleCreated = (data: any) => {
      const t = typeof data === "string" ? JSON.parse(data) : data;
      if (t?.ticket) setTickets(prev => [t.ticket, ...prev.filter(x => x.id !== t.ticket.id)]);
    };
    const handleUpdated = (data: any) => {
      const t = typeof data === "string" ? JSON.parse(data) : data;
      if (t?.ticket) {
        setTickets(prev => prev.map(x => x.id === t.ticket.id ? t.ticket : x));
        setActiveTicket(prev => prev?.id === t.ticket.id ? { ...prev, ...t.ticket } : prev);
      }
    };
    const handleDeleted = (data: any) => {
      const t = typeof data === "string" ? JSON.parse(data) : data;
      if (t?.ticketId) {
        setTickets(prev => prev.filter(x => x.id !== t.ticketId));
        setActiveTicket(prev => prev?.id === t.ticketId ? null : prev);
      }
    };
    const handleComment = (data: any) => {
      const t = typeof data === "string" ? JSON.parse(data) : data;
      if (t?.ticketId && activeTicket?.id === t.ticketId && t.comment) {
        setActiveTicket(prev => prev ? { ...prev, comments: [...prev.comments, t.comment], commentCount: prev.commentCount + 1 } : prev);
      }
    };

    hub.on("TicketCreated", handleCreated);
    hub.on("TicketUpdated", handleUpdated);
    hub.on("TicketDeleted", handleDeleted);
    hub.on("TicketCommentAdded", handleComment);

    return () => {
      hub.off("TicketCreated", handleCreated);
      hub.off("TicketUpdated", handleUpdated);
      hub.off("TicketDeleted", handleDeleted);
      hub.off("TicketCommentAdded", handleComment);
    };
  }, [hub, activeTicket?.id]);

  return {
    tickets, totalCount, totalPages, currentPage, loading, error,
    activeTicket, loadingTicket, setActiveTicket,
    loadTickets, getTicketDetail, getTicketByNumber,
    createTicket, updateTicket, deleteTicket, addComment, addAttachment,
  };
}
