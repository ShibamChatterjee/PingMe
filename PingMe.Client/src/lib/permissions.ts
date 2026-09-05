export type BuiltinOrgRole = "Owner" | "Manager" | "Member";

export type OrgRole = BuiltinOrgRole | string;

export interface CustomRole {
  id: string;
  name: string;
  baseRole: BuiltinOrgRole;
  description: string;
  color: string;
  permissions: PermissionKey[];
  createdAt: string;
}

export type PermissionKey =
  // Organization-level
  | "manage_organization"
  | "delete_organization"
  | "transfer_ownership"
  | "manage_billing"
  | "manage_integrations"
  | "view_audit_log"
  | "manage_security_policies"
  
  // Role & Permissions
  | "manage_roles"
  
  // Member management
  | "invite_members"
  | "manage_members"
  | "suspend_members"
  | "remove_members"
  | "change_member_roles"
  | "browse_directory"
  
  // Group / Channel management
  | "create_public_groups"
  | "create_private_groups"
  | "manage_all_groups"
  | "manage_assigned_groups"
  | "assign_group_managers"
  | "delete_groups"
  | "add_group_members"
  | "remove_group_members"
  | "moderate_group_messages"
  
  // Messaging & Communication
  | "send_messages"
  | "reply_messages"
  | "react_messages"
  | "share_files"
  | "start_calls"
  | "start_screen_share"
  | "start_direct_messages";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: "Organization" | "Members & Roles" | "Groups & Channels" | "Communication & Media";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Organization
  {
    key: "manage_organization",
    label: "Manage Organization",
    description: "Edit workspace name, logo, description, URL and general settings",
    category: "Organization",
  },
  {
    key: "manage_integrations",
    label: "Manage Integrations",
    description: "Install, configure, and remove workspace bots and webhooks",
    category: "Organization",
  },
  {
    key: "view_audit_log",
    label: "View Audit Log",
    description: "Access complete security and administrative activity log",
    category: "Organization",
  },
  {
    key: "manage_security_policies",
    label: "Manage Security Policies",
    description: "Configure invite permissions and security restrictions",
    category: "Organization",
  },
  {
    key: "transfer_ownership",
    label: "Transfer Ownership",
    description: "Transfer primary ownership of workspace to another member (Owner only)",
    category: "Organization",
  },
  {
    key: "delete_organization",
    label: "Delete Organization",
    description: "Permanently delete workspace and all associated data (Owner only)",
    category: "Organization",
  },

  // Members & Roles
  {
    key: "invite_members",
    label: "Invite Members",
    description: "Send invitation emails and generate workspace invite links",
    category: "Members & Roles",
  },
  {
    key: "manage_members",
    label: "Manage Members",
    description: "View and edit member details and workspace memberships",
    category: "Members & Roles",
  },
  {
    key: "change_member_roles",
    label: "Change Member Roles",
    description: "Promote members to Group Manager or demote to Member",
    category: "Members & Roles",
  },
  {
    key: "suspend_members",
    label: "Suspend Members",
    description: "Temporarily deactivate member accounts and revoke active sessions",
    category: "Members & Roles",
  },
  {
    key: "remove_members",
    label: "Remove Members",
    description: "Expel members from the organization",
    category: "Members & Roles",
  },
  {
    key: "manage_roles",
    label: "Manage Roles & Permissions",
    description: "Workspace owner role administration",
    category: "Members & Roles",
  },
  {
    key: "browse_directory",
    label: "Browse Member Directory",
    description: "View the complete organization directory and all member profiles",
    category: "Members & Roles",
  },

  // Groups & Channels
  {
    key: "create_public_groups",
    label: "Create Public Groups",
    description: "Create channels discoverable by all workspace members",
    category: "Groups & Channels",
  },
  {
    key: "create_private_groups",
    label: "Create Private Groups",
    description: "Create invite-only restricted channels",
    category: "Groups & Channels",
  },
  {
    key: "manage_all_groups",
    label: "Manage All Groups",
    description: "Edit settings, delete, or reassign managers for any group in the org",
    category: "Groups & Channels",
  },
  {
    key: "manage_assigned_groups",
    label: "Manage Assigned Groups",
    description: "Manage settings, info, and members for groups where assigned as Group Manager",
    category: "Groups & Channels",
  },
  {
    key: "assign_group_managers",
    label: "Assign Group Managers",
    description: "Designate team leads and group administrators for specific channels",
    category: "Groups & Channels",
  },
  {
    key: "add_group_members",
    label: "Add Group Members",
    description: "Invite and add workspace members to specific groups",
    category: "Groups & Channels",
  },
  {
    key: "remove_group_members",
    label: "Remove Group Members",
    description: "Remove members from groups where permitted",
    category: "Groups & Channels",
  },
  {
    key: "moderate_group_messages",
    label: "Moderate Group Messages",
    description: "Pin, delete, or moderate messages in managed groups",
    category: "Groups & Channels",
  },
  {
    key: "delete_groups",
    label: "Delete / Archive Groups",
    description: "Permanently delete or archive channels",
    category: "Groups & Channels",
  },

  // Communication & Media
  {
    key: "send_messages",
    label: "Send Messages",
    description: "Post messages in accessible channels and direct chats",
    category: "Communication & Media",
  },
  {
    key: "reply_messages",
    label: "Reply to Messages",
    description: "Start message threads and quote messages",
    category: "Communication & Media",
  },
  {
    key: "react_messages",
    label: "React to Messages",
    description: "Add emoji reactions to messages",
    category: "Communication & Media",
  },
  {
    key: "share_files",
    label: "Share Files & Media",
    description: "Upload attachments, code snippets, and whiteboards",
    category: "Communication & Media",
  },
  {
    key: "start_calls",
    label: "Start Voice/Video Calls",
    description: "Initiate direct or group audio/video calls",
    category: "Communication & Media",
  },
  {
    key: "start_screen_share",
    label: "Start Screen Sharing",
    description: "Share screen or application window during calls",
    category: "Communication & Media",
  },
  {
    key: "start_direct_messages",
    label: "Start Direct Messages",
    description: "Initiate 1-on-1 direct conversations with other members",
    category: "Communication & Media",
  },
];

// Default base role permission mappings
export const DEFAULT_ROLE_PERMISSIONS: Record<BuiltinOrgRole, PermissionKey[]> = {
  Owner: [
    "manage_organization",
    "delete_organization",
    "transfer_ownership",
    "manage_billing",
    "manage_integrations",
    "view_audit_log",
    "manage_security_policies",
    "manage_roles",
    "invite_members",
    "manage_members",
    "suspend_members",
    "remove_members",
    "change_member_roles",
    "browse_directory",
    "create_public_groups",
    "create_private_groups",
    "manage_all_groups",
    "manage_assigned_groups",
    "assign_group_managers",
    "delete_groups",
    "add_group_members",
    "remove_group_members",
    "moderate_group_messages",
    "send_messages",
    "reply_messages",
    "react_messages",
    "share_files",
    "start_calls",
    "start_screen_share",
    "start_direct_messages",
  ],

  Manager: [
    "browse_directory",
    "create_public_groups",
    "create_private_groups",
    "manage_assigned_groups",
    "add_group_members",
    "remove_group_members",
    "moderate_group_messages",
    "send_messages",
    "reply_messages",
    "react_messages",
    "share_files",
    "start_calls",
    "start_screen_share",
    "start_direct_messages",
  ],

  Member: [
    "browse_directory",
    "create_public_groups",
    "send_messages",
    "reply_messages",
    "react_messages",
    "share_files",
    "start_calls",
    "start_screen_share",
    "start_direct_messages",
  ],
};

export interface PermissionContext {
  userRole: OrgRole;
  customRoles?: CustomRole[];
  assignedGroupManagerIds?: string[];
  currentGroupId?: string;
  isGroupMember?: boolean;
  groupVisibility?: "public" | "private";
  workspacePolicies?: WorkspacePolicies;
}

export interface WorkspacePolicies {
  allowMemberGroupCreation: boolean;
  allowMemberInvites: boolean;
  restrictGuestDirectMessages?: boolean;
  require2FAForAdmins?: boolean;
  allowPublicChannelDiscovery?: boolean;
}

export const DEFAULT_WORKSPACE_POLICIES: WorkspacePolicies = {
  allowMemberGroupCreation: true,
  allowMemberInvites: false,
  restrictGuestDirectMessages: false,
  require2FAForAdmins: false,
  allowPublicChannelDiscovery: true,
};

/**
 * Normalizes role string to canonical BuiltinOrgRole ("Owner", "Manager", "Member")
 */
export function getCanonicalRole(role: OrgRole | number | undefined | null): BuiltinOrgRole {
  if (role === undefined || role === null) return "Member";
  if (typeof role === "number") {
    if (role === 0) return "Owner";
    if (role === 1) return "Manager";
    return "Member";
  }
  const str = String(role).trim().toLowerCase();
  if (str === "owner") return "Owner";
  if (str === "manager" || str === "group manager" || str === "group admin" || str === "admin") return "Manager";
  return "Member";
}

/**
 * Checks whether a user has a specific permission based on their role and context.
 */
export function hasPermission(
  permission: PermissionKey,
  context: PermissionContext,
  permissionOverrides?: Record<BuiltinOrgRole, PermissionKey[]>,
): boolean {
  const baseRole = getCanonicalRole(context.userRole);

  // Check custom role definitions if user has a custom role
  if (context.customRoles && !["Owner", "Manager", "Member"].includes(context.userRole)) {
    const customRole = context.customRoles.find((r) => r.id === context.userRole || r.name === context.userRole);
    if (customRole && customRole.permissions.includes(permission)) {
      return true;
    }
  }

  // Check workspace policy overrides for specific member permissions
  if (context.workspacePolicies) {
    if (permission === "create_public_groups" && baseRole === "Member") {
      return context.workspacePolicies.allowMemberGroupCreation;
    }
    if (permission === "invite_members" && (baseRole === "Member" || baseRole === "Manager")) {
      return context.workspacePolicies.allowMemberInvites;
    }
  }

  // Check Group Manager assigned group privileges
  if (
    context.currentGroupId &&
    context.assignedGroupManagerIds?.includes(context.currentGroupId)
  ) {
    if (
      permission === "manage_assigned_groups" ||
      permission === "add_group_members" ||
      permission === "remove_group_members" ||
      permission === "moderate_group_messages"
    ) {
      return true;
    }
  }

  const rolePerms = permissionOverrides?.[baseRole] ?? DEFAULT_ROLE_PERMISSIONS[baseRole] ?? [];
  return rolePerms.includes(permission);
}

/**
 * Determines if user can view a given group based on visibility and membership.
 */
export function canAccessGroup(
  userRole: OrgRole,
  isMemberOfGroup: boolean,
  groupVisibility: "public" | "private" = "public",
): boolean {
  const role = getCanonicalRole(userRole);
  
  // Owner can access any group
  if (role === "Owner") return true;

  // For Members and Managers:
  // Public groups: accessible to everyone in org
  // Private groups: accessible ONLY if they are a member
  if (groupVisibility === "public") return true;
  return isMemberOfGroup;
}

/**
 * Determines if an actor can perform management actions (promote, demote, suspend, remove) on a target user.
 */
export function canManageTargetUser(
  actorRole: OrgRole,
  _targetRole: OrgRole,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) return false; // Cannot remove/demote self via standard member management
  const actor = getCanonicalRole(actorRole);
  return actor === "Owner";
}
