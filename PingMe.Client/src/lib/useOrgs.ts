import { useCallback, useEffect, useState } from "react";
import {
  api,
  ticketApi,
  type OrganizationResponseDto,
  type MemberResponseDto,
  type InviteResponseDto,
  type Group,
  type CreateOrganizationPayload,
  type UpdateOrganizationPayload,
  type OrgRole,
  type CreateGroupPayload,
  roleToNumeric,
} from "./api";

const ACTIVE_ORG_KEY = "pingme.activeOrg";

export function useOrgs(token: string | null) {
  const [orgs, setOrgs] = useState<OrganizationResponseDto[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationResponseDto | null>(null);
  const [members, setMembers] = useState<MemberResponseDto[]>([]);
  const [invites, setInvites] = useState<InviteResponseDto[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh organization list
  const refreshOrgs = useCallback(async () => {
    if (!token) return;
    try {
      const list = await api.orgs.getMy(token);
      setOrgs(list);

      const savedId = localStorage.getItem(ACTIVE_ORG_KEY);
      setActiveOrg((prev) => {
        if (prev && list.some((o) => o.id === prev.id)) {
          return list.find((o) => o.id === prev.id) ?? list[0] ?? null;
        }
        const found = savedId ? list.find((o) => o.id === savedId) : null;
        return found ?? list[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organizations");
    }
  }, [token]);

  // Refresh active organization data (members, invites, groups)
  const refreshActiveOrgData = useCallback(async () => {
    if (!token || !activeOrg) {
      setMembers([]);
      setInvites([]);
      setGroups([]);
      return;
    }

    try {
      const [membersData, groupsData] = await Promise.all([
        api.orgs.getMembers(token, activeOrg.id).catch(() => []),
        api.groups.list(token, activeOrg.id).catch(() => []),
      ]);

      setMembers(membersData);
      setGroups(groupsData);

      // If user is Owner, load invites
      if (activeOrg.myRole === "Owner") {
        try {
          const invitesData = await api.orgs.getInvites(token, activeOrg.id);
          setInvites(invitesData);
        } catch {
          setInvites([]);
        }
      } else {
        setInvites([]);
      }
    } catch (e) {
      console.error("Failed to load active org details:", e);
    }
  }, [token, activeOrg]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      refreshOrgs().finally(() => setLoading(false));
    }
  }, [token, refreshOrgs]);

  useEffect(() => {
    refreshActiveOrgData();
  }, [refreshActiveOrgData]);

  const switchOrg = useCallback((org: OrganizationResponseDto) => {
    setActiveOrg(org);
    localStorage.setItem(ACTIVE_ORG_KEY, org.id);
  }, []);

  const createOrg = useCallback(
    async (payload: CreateOrganizationPayload) => {
      if (!token) return null;
      const org = await api.orgs.create(token, payload);
      await refreshOrgs();
      setActiveOrg(org);
      localStorage.setItem(ACTIVE_ORG_KEY, org.id);
      return org;
    },
    [token, refreshOrgs],
  );

  const updateOrg = useCallback(
    async (payload: UpdateOrganizationPayload) => {
      if (!token || !activeOrg) return null;
      const updated = await api.orgs.update(token, activeOrg.id, payload);
      setActiveOrg(updated);
      await refreshOrgs();
      return updated;
    },
    [token, activeOrg, refreshOrgs],
  );

  const deleteOrg = useCallback(async () => {
    if (!token || !activeOrg) return;
    await api.orgs.delete(token, activeOrg.id);
    localStorage.removeItem(ACTIVE_ORG_KEY);
    setActiveOrg(null);
    await refreshOrgs();
  }, [token, activeOrg, refreshOrgs]);

  const transferOwnership = useCallback(
    async (newOwnerUserId: string) => {
      if (!token || !activeOrg) return;
      await api.orgs.transferOwnership(token, activeOrg.id, newOwnerUserId);
      await refreshOrgs();
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshOrgs, refreshActiveOrgData],
  );

  const sendInvites = useCallback(
    async (
      inviteList: Array<{
        email: string;
        role: OrgRole;
        initialGroupIds: string[];
      }>,
    ) => {
      if (!token || !activeOrg) return;
      await api.orgs.sendInvites(token, activeOrg.id, {
        invites: inviteList.map((i) => ({
          email: i.email,
          role: roleToNumeric(i.role),
          initialGroupIds: i.initialGroupIds,
        })),
      });
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const resendInvite = useCallback(
    async (inviteId: string) => {
      if (!token || !activeOrg) return;
      await api.orgs.resendInvite(token, activeOrg.id, inviteId);
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      if (!token || !activeOrg) return;
      await api.orgs.revokeInvite(token, activeOrg.id, inviteId);
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const updateMemberRole = useCallback(
    async (targetUserId: string, newRole: OrgRole) => {
      if (!token || !activeOrg) return;
      await api.orgs.updateMemberRole(token, activeOrg.id, targetUserId, newRole);
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const toggleSuspendMember = useCallback(
    async (targetUserId: string) => {
      if (!token || !activeOrg) return;
      await api.orgs.toggleSuspendMember(token, activeOrg.id, targetUserId);
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const removeMember = useCallback(
    async (targetUserId: string) => {
      if (!token || !activeOrg) return;
      await api.orgs.removeMember(token, activeOrg.id, targetUserId);
      await refreshActiveOrgData();
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const createGroup = useCallback(
    async (payload: CreateGroupPayload) => {
      if (!token || !activeOrg) return null;
      const grp = await api.groups.create(token, activeOrg.id, payload);
      await refreshActiveOrgData();
      return grp;
    },
    [token, activeOrg, refreshActiveOrgData],
  );

  const toggleTicketSystem = useCallback(
    async (enabled: boolean) => {
      if (!token || !activeOrg) return;
      await ticketApi.setSettings(token, activeOrg.id, enabled);
      setActiveOrg((prev) => (prev ? { ...prev, ticketSystemEnabled: enabled } : null));
      setOrgs((prev) =>
        prev.map((o) => (o.id === activeOrg.id ? { ...o, ticketSystemEnabled: enabled } : o)),
      );
    },
    [token, activeOrg],
  );

  return {
    orgs,
    activeOrg,
    members,
    invites,
    groups,
    loading,
    error,
    refreshOrgs,
    refreshActiveOrgData,
    switchOrg,
    createOrg,
    updateOrg,
    deleteOrg,
    transferOwnership,
    sendInvites,
    resendInvite,
    revokeInvite,
    updateMemberRole,
    toggleSuspendMember,
    removeMember,
    createGroup,
    toggleTicketSystem,
  };
}
