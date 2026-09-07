// Typed API client for PingMe backend

export const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5001/api";
export const HUB_URL = (import.meta as any).env?.VITE_HUB_URL || "http://localhost:5001/hubs/chat";

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  accessToken: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  hasKeypair?: boolean;
  isNewUser?: boolean;
}

export interface UserKeypair {
  publicKey?: string;
  identityPublicKey?: string;
  encryptedPrivateKey: string;
  salt: string;
}

export interface UserSearchItem {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isContact?: boolean;
}

export interface DirectChat {
  id: string;
  organizationId: string;
  otherUserId: string;
  otherUsername: string;
  otherAvatarUrl?: string;
  lastPreview?: string;
  updatedAt: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  username: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  topic?: string;
  visibility: "public" | "private";
  createdBy: string;
  groupManagerId?: string;
  groupManagerName?: string;
  members: GroupMember[];
  lastPreview?: string;
  updatedAt: string;
  createdAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  topic?: string;
  visibility?: "public" | "private";
  groupManagerId?: string;
  memberUserIds: string[];
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  chatId: string;
  chatType: "dm" | "group";
  senderId: string;
  senderName?: string;
  ciphertext?: string;
  nonce?: string;
  selfCiphertext?: string;
  selfNonce?: string;
  content?: string;
  type: "text" | "image" | "file" | "audio" | "video" | "pdf";
  status: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  sentAt: string;
  _temp?: boolean;
}

export interface SendMessagePayload {
  organizationId: string;
  chatId: string;
  chatType: "dm" | "group";
  ciphertext: string;
  nonce: string;
  selfCiphertext?: string;
  selfNonce?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface UnreadCount {
  conversationId: string;
  count: number;
}

export interface WorkspaceFileDto {
  id: string;
  organizationId: string;
  chatId: string;
  chatType: "dm" | "group";
  chatName?: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  sentAt: string;
  isMe: boolean;
}

// ── Organization & Role Types ────────────────────────────────────────────────

export type OrgRole = "Owner" | "Manager" | "Member";

const ROLE_MAP: Record<number, OrgRole> = {
  0: "Owner",
  1: "Manager",
  2: "Member",
  3: "Member",
  4: "Member",
};

export function normalizeRole(role: OrgRole | number | string): OrgRole {
  if (typeof role === "number") return ROLE_MAP[role] ?? "Member";
  const str = String(role).trim().toLowerCase();
  if (str === "owner") return "Owner";
  if (str === "manager" || str === "group manager" || str === "group admin" || str === "admin") return "Manager";
  return "Member";
}

export function roleToNumeric(role: OrgRole): number {
  switch (role) {
    case "Owner": return 0;
    case "Manager": return 1;
    case "Member": return 2;
    default: return 2;
  }
}

export interface WorkspacePolicies {
  allowMemberGroupCreation: boolean;
  allowMemberInvites: boolean;
  restrictGuestDirectMessages?: boolean;
  require2FAForAdmins?: boolean;
  allowPublicChannelDiscovery?: boolean;
}

export interface OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
  ownerId: string;
  ownerName: string;
  joinCode?: string;
  joinCodeEnabled: boolean;
  ticketSystemEnabled: boolean;
  policies: WorkspacePolicies;
  myRole: OrgRole;
  createdAt: string;
}

export interface MemberResponseDto {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role: OrgRole;
  department?: string;
  title?: string;
  isSuspended: boolean;
  managedGroupIds: string[];
  joinedAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
  slug?: string;
  starterChannels?: string[];
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
  slug?: string;
  policies?: WorkspacePolicies;
}

export interface InviteByEmailDto {
  email: string;
  role: OrgRole;
  initialGroupIds?: string[];
}

export interface BatchInvitePayload {
  invites: Array<{
    email: string;
    role: number;
    initialGroupIds: string[];
  }>;
}

export interface InviteResponseDto {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedByUserId: string;
  invitedByUsername: string;
  initialGroupIds: string[];
  status: "Pending" | "Accepted" | "Declined" | "Revoked" | "Expired";
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface InvitePreviewDto {
  organizationId: string;
  organizationName: string;
  description?: string;
  logoUrl?: string;
  inviterName: string;
  role: OrgRole;
  initialGroupNames: string[];
  memberCount: number;
  groupCount: number;
}

export interface JoinCodeResponse {
  joinCode: string;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

export function getAuthHeaders(
  token?: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...extraHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = getAuthHeaders(token, (opts.headers as Record<string, string>) || {});
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pingme:unauthorized"));
    }
    throw new Error("Session expired or unauthorized. Please log in again.");
  }

  const text = await res.text();

  if (!res.ok) throw new Error(`API ${res.status}: ${text || res.statusText}`);
  if (res.status === 204 || !text) return undefined as T;

  return JSON.parse(text) as T;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  login: async (email: string, password: string) => {
    const raw = await apiFetch<any>("/Auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return {
      token: raw.token || raw.accessToken,
      accessToken: raw.accessToken || raw.token,
      userId: raw.user?.id || raw.userId,
      username: raw.user?.username || raw.username,
      email: raw.user?.email || raw.email || email,
      avatarUrl: raw.user?.avatarUrl || raw.avatarUrl,
      hasKeypair: raw.user?.hasKeypair ?? raw.hasKeypair ?? true,
      isNewUser: raw.isNewUser ?? false,
    } as AuthResult;
  },

  register: async (username: string, email: string, password: string) => {
    const raw = await apiFetch<any>("/Auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    return {
      token: raw.token || raw.accessToken,
      accessToken: raw.accessToken || raw.token,
      userId: raw.user?.id || raw.userId,
      username: raw.user?.username || raw.username,
      email: raw.user?.email || raw.email || email,
      avatarUrl: raw.user?.avatarUrl || raw.avatarUrl,
      hasKeypair: raw.user?.hasKeypair ?? raw.hasKeypair ?? false,
      isNewUser: true,
    } as AuthResult;
  },

  googleLogin: async (credential: string) => {
    const raw = await apiFetch<any>("/Auth/google-login", {
      method: "POST",
      body: JSON.stringify({ idToken: credential }),
    });
    return {
      token: raw.token || raw.accessToken,
      accessToken: raw.accessToken || raw.token,
      userId: raw.user?.id || raw.userId,
      username: raw.user?.username || raw.username,
      email: raw.user?.email || raw.email,
      avatarUrl: raw.user?.avatarUrl || raw.avatarUrl,
      hasKeypair: raw.user?.hasKeypair ?? raw.hasKeypair ?? true,
      isNewUser: raw.isNewUser ?? false,
    } as AuthResult;
  },

  getKeypair: (token: string) =>
    apiFetch<UserKeypair>("/User/keypair", {}, token),

  saveKeypair: (token: string, keypair: UserKeypair) =>
    apiFetch<void>("/User/keypair", {
      method: "POST",
      body: JSON.stringify(keypair),
    }, token),

  publishKey: (token: string, key: string | UserKeypair) => {
    const identityPublicKey = typeof key === "string" ? key : (key.identityPublicKey || key.publicKey || "");
    return apiFetch<void>("/Users/keys", {
      method: "POST",
      body: JSON.stringify({ identityPublicKey }),
    }, token);
  },

  getProfile: (token: string, userId: string) =>
    apiFetch<{ id: string; username: string; email: string; avatarUrl?: string }>(`/User/${userId}`, {}, token),

  getPublicKey: (token: string, userId: string) =>
    apiFetch<{ publicKey: string; identityPublicKey?: string }>(`/User/${userId}/keys`, {}, token),

  uploadAvatar: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/users/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload avatar");
    return (await res.json()) as { avatarUrl: string };
  },

  updateProfile: async (token: string, data: { avatarUrl?: string }) => {
    return apiFetch<{ success: boolean; avatarUrl?: string }>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
  },

  searchUsers: (token: string, query: string, orgId?: string) =>
    apiFetch<UserSearchItem[]>(
      `/User/search?q=${encodeURIComponent(query)}${orgId ? `&orgId=${encodeURIComponent(orgId)}` : ""}`,
      orgId ? { headers: { "X-Org-Id": orgId } } : {},
      token,
    ),

  getContacts: (token: string) =>
    apiFetch<UserSearchItem[]>("/User/contacts", {}, token),

  addContact: (token: string, contactUserId: string) =>
    apiFetch<void>("/User/contacts", {
      method: "POST",
      body: JSON.stringify({ contactUserId }),
    }, token),

  removeContact: (token: string, contactUserId: string) =>
    apiFetch<void>(`/User/contacts/${contactUserId}`, { method: "DELETE" }, token),

  getUnreadCounts: (token: string) =>
    apiFetch<UnreadCount[]>("/notifications/unread", {}, token).catch(() => []),

  markChatRead: (token: string, conversationId: string) =>
    apiFetch<void>(`/notifications/${conversationId}/read`, {
      method: "POST",
    }, token).catch(() => { }),

  uploadFile: async (token: string, file: File, orgId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (orgId) headers["X-Org-Id"] = orgId;

    const res = await fetch(`${API_BASE}/Messages/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const data = await res.json();
    return {
      url: data.fileUrl || data.url,
      fileUrl: data.fileUrl || data.url,
      fileName: data.fileName || file.name,
      fileType: data.fileType || file.type,
      fileSize: data.fileSize || file.size,
    };
  },

  // ── Organizations ──────────────────────────────────────────────────────────

  orgs: {
    create: async (token: string, payload: CreateOrganizationPayload) => {
      const res = await apiFetch<OrganizationResponseDto>("/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);
      return { ...res, myRole: normalizeRole(res.myRole) };
    },

    getMy: async (token: string) => {
      const list = await apiFetch<OrganizationResponseDto[]>("/organizations/mine", {}, token);
      return list.map((o) => ({ ...o, myRole: normalizeRole(o.myRole) }));
    },

    list: async (token: string) => {
      const list = await apiFetch<OrganizationResponseDto[]>("/organizations/mine", {}, token);
      return list.map((o) => ({ ...o, myRole: normalizeRole(o.myRole) }));
    },

    getById: async (token: string, orgId: string) => {
      const res = await apiFetch<OrganizationResponseDto>(`/organizations/${orgId}`, {
        headers: { "X-Org-Id": orgId },
      }, token);
      return { ...res, myRole: normalizeRole(res.myRole) };
    },

    update: async (token: string, orgId: string, payload: UpdateOrganizationPayload) => {
      const res = await apiFetch<OrganizationResponseDto>(`/organizations/${orgId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "X-Org-Id": orgId },
      }, token);
      return { ...res, myRole: normalizeRole(res.myRole) };
    },

    delete: (token: string, orgId: string) =>
      apiFetch<void>(`/organizations/${orgId}`, {
        method: "DELETE",
        headers: { "X-Org-Id": orgId },
      }, token),

    transferOwnership: (token: string, orgId: string, newOwnerUserId: string) =>
      apiFetch<void>(`/organizations/${orgId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ newOwnerUserId }),
        headers: { "X-Org-Id": orgId },
      }, token),

    joinByCode: async (token: string, joinCode: string) => {
      const res = await apiFetch<OrganizationResponseDto>(`/organizations/join/${joinCode}`, {
        method: "POST",
      }, token);
      return { ...res, myRole: normalizeRole(res.myRole) };
    },

    generateJoinCode: (token: string, orgId: string) =>
      apiFetch<JoinCodeResponse>(`/organizations/${orgId}/join-code`, {
        method: "POST",
        headers: { "X-Org-Id": orgId },
      }, token),

    disableJoinCode: (token: string, orgId: string) =>
      apiFetch<void>(`/organizations/${orgId}/join-code`, {
        method: "DELETE",
        headers: { "X-Org-Id": orgId },
      }, token),

    sendInvites: (token: string, orgId: string, payload: BatchInvitePayload) =>
      apiFetch<InviteResponseDto[]>(`/organizations/${orgId}/invites`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "X-Org-Id": orgId },
      }, token),

    getInvites: async (token: string, orgId: string) => {
      const list = await apiFetch<InviteResponseDto[]>(`/organizations/${orgId}/invites`, {
        headers: { "X-Org-Id": orgId },
      }, token);
      return list.map((i) => ({ ...i, role: normalizeRole(i.role) }));
    },

    resendInvite: (token: string, orgId: string, inviteId: string) =>
      apiFetch<void>(`/organizations/${orgId}/invites/${inviteId}/resend`, {
        method: "POST",
        headers: { "X-Org-Id": orgId },
      }, token),

    revokeInvite: (token: string, orgId: string, inviteId: string) =>
      apiFetch<void>(`/organizations/${orgId}/invites/${inviteId}`, {
        method: "DELETE",
        headers: { "X-Org-Id": orgId },
      }, token),

    getInvitePreview: async (inviteToken: string) => {
      const res = await apiFetch<InvitePreviewDto>(`/organizations/invites/${inviteToken}/preview`);
      return { ...res, role: normalizeRole(res.role) };
    },

    acceptInvite: async (token: string, inviteToken: string) => {
      const res = await apiFetch<OrganizationResponseDto>(`/organizations/invites/${inviteToken}/accept`, {
        method: "POST",
      }, token);
      return { ...res, myRole: normalizeRole(res.myRole) };
    },

    declineInvite: (token: string, inviteToken: string) =>
      apiFetch<void>(`/organizations/invites/${inviteToken}/decline`, {
        method: "POST",
      }, token),

    getMembers: async (token: string, orgId: string) => {
      const list = await apiFetch<MemberResponseDto[]>(`/organizations/${orgId}/members`, {
        headers: { "X-Org-Id": orgId },
      }, token);
      return list.map((m) => ({ ...m, role: normalizeRole(m.role) }));
    },

    updateMemberRole: (token: string, orgId: string, targetUserId: string, role: OrgRole) =>
      apiFetch<void>(`/organizations/${orgId}/members/${targetUserId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleToNumeric(role) }),
        headers: { "X-Org-Id": orgId },
      }, token),

    toggleSuspendMember: (token: string, orgId: string, targetUserId: string) =>
      apiFetch<void>(`/organizations/${orgId}/members/${targetUserId}/suspend`, {
        method: "PATCH",
        headers: { "X-Org-Id": orgId },
      }, token),

    removeMember: (token: string, orgId: string, targetUserId: string) =>
      apiFetch<void>(`/organizations/${orgId}/members/${targetUserId}`, {
        method: "DELETE",
        headers: { "X-Org-Id": orgId },
      }, token),

    getFiles: async (
      token: string,
      orgId: string,
      params?: { userId?: string; type?: string }
    ) => {
      const query = new URLSearchParams();
      if (params?.userId && params.userId !== "all") query.set("userId", params.userId);
      if (params?.type && params.type !== "all") query.set("type", params.type);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return apiFetch<WorkspaceFileDto[]>(`/organizations/${orgId}/files${qs}`, {
        headers: { "X-Org-Id": orgId },
      }, token);
    },
  },

  // ── Notes / Audit Trail ───────────────────────────────────────────────────

  notes: {
    getNotes: (
      token: string,
      orgId: string,
      params?: { page?: number; pageSize?: number; type?: number; search?: string },
    ) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
      if (params?.type !== undefined && params.type !== null && params.type >= 0) {
        query.set("type", params.type.toString());
      }
      if (params?.search) query.set("search", params.search);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return apiFetch<NotesPagedResultDto>(
        `/organizations/${orgId}/notes${qs}`,
        { headers: { "X-Org-Id": orgId } },
        token,
      );
    },

    getNoteById: (token: string, orgId: string, id: string) =>
      apiFetch<NoteDto>(
        `/organizations/${orgId}/notes/${id}`,
        { headers: { "X-Org-Id": orgId } },
        token,
      ),
  },

  // ── Direct Chats ───────────────────────────────────────────────────────────

  directChats: {
    getOrCreate: (token: string, orgId: string, targetUserId: string) =>
      apiFetch<DirectChat>(`/organizations/${orgId}/direct-chats`, {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      }, token),

    list: (token: string, orgId: string) =>
      apiFetch<DirectChat[]>(`/organizations/${orgId}/direct-chats`, {}, token),

    loadHistory: (token: string, orgId: string, chatId: string, limit = 50) =>
      apiFetch<ChatMessage[]>(`/organizations/${orgId}/direct-chats/${chatId}/messages?limit=${limit}`, {}, token),
  },

  // ── Groups ─────────────────────────────────────────────────────────────────

  groups: {
    create: (token: string, orgId: string, payload: CreateGroupPayload) =>
      apiFetch<Group>(`/organizations/${orgId}/groups`, {
        method: "POST",
        body: JSON.stringify(payload),
      }, token),

    list: (token: string, orgId: string) =>
      apiFetch<Group[]>(`/organizations/${orgId}/groups`, {}, token),

    getById: (token: string, orgId: string, groupId: string) =>
      apiFetch<Group>(`/organizations/${orgId}/groups/${groupId}`, {}, token),

    loadHistory: (token: string, orgId: string, groupId: string, limit = 50) =>
      apiFetch<ChatMessage[]>(`/organizations/${orgId}/groups/${groupId}/messages?limit=${limit}`, {}, token),

    addMember: (token: string, orgId: string, groupId: string, userId: string) =>
      apiFetch<void>(`/organizations/${orgId}/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }, token),

    removeMember: (token: string, orgId: string, groupId: string, targetUserId: string) =>
      apiFetch<void>(`/organizations/${orgId}/groups/${groupId}/members/${targetUserId}`, {
        method: "DELETE",
      }, token),
  },
};

export const NoteType = {
  Org: 0,
  User: 1,
  Member: 2,
  Group: 3,
  Role: 4,
  Permission: 5,
  Invitation: 6,
  Message: 7,
  Security: 8,
} as const;

export type NoteType = typeof NoteType[keyof typeof NoteType];

export interface NoteDto {
  id: string;
  description: string;
  orgId: string;
  type: NoteType;
  typeName: string;
  date: string;
}

export interface NotesPagedResultDto {
  items: NoteDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
// Ticket domain models, enums, and request contracts

export const TicketStatus = {
  Open: "Open",
  InProgress: "InProgress",
  Resolved: "Resolved",
  Closed: "Closed",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const TicketCategory = {
  General: "General",
  Bug: "Bug",
  Feature: "Feature",
  Technical: "Technical",
  Question: "Question",
  Other: "Other",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export interface TicketAttachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: string;
  uploadedByUsername?: string;
  uploadedAt?: string;
}

export interface TicketComment {
  id: string;
  authorUserId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  content: string;
  attachments?: TicketAttachment[];
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  actorUserId: string;
  actorUsername: string;
  actorAvatarUrl?: string;
  eventType: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  workspaceId: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  createdByUsername: string;
  createdByAvatarUrl?: string;
  assignedTo?: string;
  assignedToUsername?: string;
  assignedToAvatarUrl?: string;
  commentCount: number;
  attachmentCount?: number;
  attachments?: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  comments: TicketComment[];
  activityLog: TicketActivity[];
  attachments: TicketAttachment[];
}

export interface PagedTicketsResult {
  items: Ticket[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignedTo?: string;
  attachments?: TicketAttachment[];
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  category?: TicketCategory;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string | null;
}

// Ticket endpoints API client methods

export const ticketApi = {
  getSettings: (token: string, orgId: string) =>
    apiFetch<{ enabled: boolean }>(`/organizations/${orgId}/ticket-settings`, {}, token),

  setSettings: (token: string, orgId: string, enabled: boolean) =>
    apiFetch<{ enabled: boolean }>(`/organizations/${orgId}/ticket-settings`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }, token),

  list: (token: string, orgId: string, params?: {
    page?: number; pageSize?: number; search?: string;
    status?: string; priority?: string; category?: string;
    assignedTo?: string; createdBy?: string; sortBy?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.priority) q.set("priority", params.priority);
    if (params?.category) q.set("category", params.category);
    if (params?.assignedTo) q.set("assignedTo", params.assignedTo);
    if (params?.createdBy) q.set("createdBy", params.createdBy);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    return apiFetch<PagedTicketsResult>(`/organizations/${orgId}/tickets?${q}`, {}, token);
  },

  getById: (token: string, orgId: string, ticketId: string) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets/${ticketId}`, {}, token),

  getByNumber: (token: string, orgId: string, ticketNumber: string) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets/by-number/${ticketNumber}`, {}, token),

  create: (token: string, orgId: string, payload: CreateTicketPayload) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  update: (token: string, orgId: string, ticketId: string, payload: UpdateTicketPayload) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, token),

  delete: (token: string, orgId: string, ticketId: string) =>
    apiFetch<void>(`/organizations/${orgId}/tickets/${ticketId}`, { method: "DELETE" }, token),

  addComment: (token: string, orgId: string, ticketId: string, content: string, attachments?: TicketAttachment[]) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, attachments }),
    }, token),

  addAttachment: (token: string, orgId: string, ticketId: string, attachment: TicketAttachment) =>
    apiFetch<TicketDetail>(`/organizations/${orgId}/tickets/${ticketId}/attachments`, {
      method: "POST",
      body: JSON.stringify(attachment),
    }, token),
};
