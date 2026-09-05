import type { BuiltinOrgRole, CustomRole, PermissionKey, WorkspacePolicies } from "./permissions";
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_WORKSPACE_POLICIES } from "./permissions";
import type { OrganizationResponseDto, MemberResponseDto, Group, InviteResponseDto } from "./api";

export interface OrgMember {
  userId: string;
  username: string;
  email: string;
  role: BuiltinOrgRole | string;
  customRoleId?: string;
  avatarUrl?: string;
  status: "online" | "away" | "offline";
  department?: string;
  title?: string;
  joinedAt: string;
  isSuspended?: boolean;
  assignedGroupManagerIds?: string[];
}

export interface WorkspaceGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  createdBy: string;
  groupManagerId: string;
  groupManagerName?: string;
  memberUserIds: string[];
  createdAt: string;
  icon?: string;
  topic?: string;
}

export type InviteStatus = "Pending" | "Accepted" | "Declined" | "Expired" | "Revoked";

export interface WorkspaceInvite {
  id: string;
  organizationId: string;
  email: string;
  role: BuiltinOrgRole | string;
  invitedByUserId: string;
  invitedByUsername: string;
  initialGroupIds: string[];
  status: InviteStatus;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorUsername: string;
  action: string;
  details: string;
  target?: string;
  timestamp: string;
}

export interface FullOrganization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  industry?: string;
  ownerId: string;
  ownerName: string;
  joinCode: string;
  joinCodeEnabled: boolean;
  ticketSystemEnabled: boolean;
  createdAt: string;
  policies: WorkspacePolicies;
  permissionOverrides: Record<BuiltinOrgRole, PermissionKey[]>;
  customRoles: CustomRole[];
  members: OrgMember[];
  groups: WorkspaceGroup[];
  invites: WorkspaceInvite[];
  auditLogs: AuditLogEntry[];
}

export function buildFullOrganization(
  orgDto: OrganizationResponseDto,
  membersDto: MemberResponseDto[] = [],
  groupsDto: Group[] = [],
  invitesDto: InviteResponseDto[] = [],
  customRoles: CustomRole[] = [],
): FullOrganization {
  const members: OrgMember[] = membersDto.map((m) => ({
    userId: m.userId,
    username: m.username,
    email: m.email || `${m.username.toLowerCase()}@workspace.io`,
    role: m.role,
    avatarUrl: m.avatarUrl,
    status: "online",
    department: m.department || "General",
    title: m.title || m.role,
    joinedAt: m.joinedAt,
    isSuspended: m.isSuspended,
    assignedGroupManagerIds: m.managedGroupIds,
  }));

  const groups: WorkspaceGroup[] = groupsDto.map((g) => ({
    id: g.id,
    organizationId: g.organizationId,
    name: g.name,
    description: g.description || "",
    topic: g.topic || g.description || "",
    visibility: g.visibility || "public",
    createdBy: g.createdBy,
    groupManagerId: g.groupManagerId || g.createdBy,
    groupManagerName: g.groupManagerName || "Group Manager",
    memberUserIds: g.members?.map((mem) => mem.userId) || [],
    createdAt: g.createdAt,
  }));

  const invites: WorkspaceInvite[] = invitesDto.map((inv) => ({
    id: inv.id,
    organizationId: inv.organizationId,
    email: inv.email,
    role: inv.role,
    invitedByUserId: inv.invitedByUserId,
    invitedByUsername: inv.invitedByUsername,
    initialGroupIds: inv.initialGroupIds || [],
    status: inv.status,
    token: inv.token,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  }));

  return {
    id: orgDto.id,
    name: orgDto.name,
    slug: orgDto.slug,
    description: orgDto.description || "Workspace communication and collaboration platform.",
    logoUrl: orgDto.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80",
    industry: orgDto.industry || "Software & Technology",
    ownerId: orgDto.ownerId,
    ownerName: orgDto.ownerName || "Owner",
    joinCode: orgDto.joinCode || "JOIN-CODE",
    joinCodeEnabled: orgDto.joinCodeEnabled ?? true,
    ticketSystemEnabled: (orgDto as any).ticketSystemEnabled ?? false,
    createdAt: orgDto.createdAt,
    policies: orgDto.policies
      ? {
        allowMemberGroupCreation: orgDto.policies.allowMemberGroupCreation,
        allowMemberInvites: orgDto.policies.allowMemberInvites,
        restrictGuestDirectMessages: orgDto.policies.restrictGuestDirectMessages,
      }
      : { ...DEFAULT_WORKSPACE_POLICIES },
    permissionOverrides: { ...DEFAULT_ROLE_PERMISSIONS },
    customRoles,
    members,
    groups,
    invites,
    auditLogs: [
      {
        id: "log-1",
        organizationId: orgDto.id,
        actorUserId: orgDto.ownerId,
        actorUsername: orgDto.ownerName || "Owner",
        action: "WORKSPACE_ACTIVE",
        details: `Organization ${orgDto.name} live with ${members.length} members and ${groups.length} channels`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
