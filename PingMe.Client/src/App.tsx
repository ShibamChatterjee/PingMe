import { useEffect, useState, useMemo, useCallback } from "react";
import "./style.css";
import {
  loadStoredAuth,
  loadStoredPrivateKey,
  storeAuth,
  storeAuthEmail,
  storePrivateKey,
  useChat,
  type AuthResult,
} from "./lib/useChat";
import { useOrgs } from "./lib/useOrgs";
import { buildFullOrganization, type FullOrganization, type OrgMember } from "./lib/orgStore";
import { api, type OrgRole, type OrganizationResponseDto } from "./lib/api";
import { initSodium, deriveKeyFromUserId } from "./lib/crypto";

import { AuthScreen } from "./components/AuthScreen";
import { OrgRail } from "./components/OrgRail";
import { OrgHeader } from "./components/OrgHeader";
import { OrgLeftNav, type NavView } from "./components/OrgLeftNav";
import { MembersView } from "./components/MembersView";
import { MemberProfilePanel } from "./components/MemberProfilePanel";
import { OverviewView } from "./components/OverviewView";
import { FilesView } from "./components/FilesView";
import { ActivityView } from "./components/ActivityView";
import { WorkspaceHubView } from "./components/WorkspaceHubView";
import { WorkspaceSettingsView } from "./components/WorkspaceSettingsView";
import { ChatView } from "./components/ChatView";
import { CreateChannelView } from "./components/CreateChannelView";
import { TicketsView } from "./components/TicketsView";
import { CallView } from "./components/CallView";
import { InviteModal } from "./components/InviteModal";
import { InvitationAcceptModal } from "./components/InvitationAcceptModal";
import { Toast } from "./components/Toast";
import { clearKeyCache } from "./lib/keyBundleCache";
import { useTickets } from "./lib/useTickets";
import { useCall, type CallEndRecord } from "./lib/useCall";
import { ThemeProvider, CssBaseline, Box, Typography, Button, Paper, Chip } from "@mui/material";
import { getMuiTheme, applyThemeVariables, type ThemeKey, THEMES } from "./theme";

type OrgModal = "create" | "join" | "settings" | "invite" | "invite_accept" | null;

export default function App() {
  const [auth, setAuth] = useState<AuthResult | null>(() => loadStoredAuth());
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(() => loadStoredPrivateKey());
  const [toast, setToast] = useState<string | null>(null);
  const [orgModal, setOrgModal] = useState<OrgModal>(null);
  const [activeView, setActiveView] = useState<NavView>(() => typeof window !== "undefined" && window.innerWidth < 900 ? "channels" : "overview");
  const [globalSearch, setGlobalSearch] = useState("");
  const [previewInviteToken, setPreviewInviteToken] = useState<string | null>(null);
  const [selectedProfileMember, setSelectedProfileMember] = useState<OrgMember | null>(null);

  // Hook into live .NET Backend API for organizations & roles
  const {
    orgs: myOrgs,
    activeOrg: activeOrgDto,
    members: activeMembers,
    invites: activeInvites,
    groups: activeGroups,
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
  } = useOrgs(auth?.token || null);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Current active organization unified representation
  const activeOrg: FullOrganization | null = useMemo(() => {
    if (!activeOrgDto) return null;
    return buildFullOrganization(
      activeOrgDto,
      activeMembers,
      activeGroups,
      activeInvites,
    );
  }, [activeOrgDto, activeMembers, activeGroups, activeInvites]);

  // Current user's role in active organization
  const currentRole = activeOrgDto?.myRole || "Member";

  // Theme Management
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem("pingme.palette.theme") as ThemeKey;
    return saved && THEMES[saved] ? saved : "terracotta";
  });

  const muiTheme = getMuiTheme(themeKey);

  useEffect(() => {
    applyThemeVariables(themeKey);
    localStorage.setItem("pingme.palette.theme", themeKey);
  }, [themeKey]);

  // Chat hook connecting directly with SignalR backend hub
  const chat = useChat(auth, myPrivateKey, activeOrg?.id ?? null, (msg) => setToast(msg));

  const tickets = useTickets({
    token: auth?.token || null,
    orgId: activeOrg?.id || null,
    hub: chat.hub,
  });

  useEffect(() => {
    if (activeView === "tickets" && activeOrg && !activeOrg.ticketSystemEnabled) {
      setActiveView("overview");
    }
  }, [activeView, activeOrg]);

  // Helper: look up a member by userId for call participant info
  const getMember = useCallback(
    (userId: string) => {
      const m = activeMembers.find((x) => x.userId.toLowerCase() === userId.toLowerCase());
      return m ? { username: m.username, avatarUrl: m.avatarUrl } : undefined;
    },
    [activeMembers],
  );

  const handleCallEnded = useCallback(
    (record: CallEndRecord) => {
      chat.sendCallRecord(record.chatId, record.callType, record.status, record.duration);
    },
    [chat.sendCallRecord],
  );

  // WebRTC call hook — uses the same SignalR hub connection via chat.hub
  const {
    callState,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  } = useCall(chat.hub, auth?.userId ?? null, getMember, auth?.token ?? null, handleCallEnded);

  const handleAuth = (data: AuthResult, privateKey: string | null, email: string) => {
    storeAuth(data);
    if (email) storeAuthEmail(email);
    if (privateKey) {
      storePrivateKey(privateKey);
      setMyPrivateKey(privateKey);
    }
    clearKeyCache();
    setAuth(data);
    setToast(`Welcome, ${data.username}!`);
  };

  const handleLogout = () => {
    storeAuth(null);
    localStorage.removeItem("pingme.activeOrg");
    clearKeyCache();
    setAuth(null);
    setMyPrivateKey(null);
    setToast("Logged out successfully.");
  };

  // Auto-redirect to Sign In / Sign Up when JWT token expires
  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
      setToast("Session expired. Please sign in again.");
    };

    window.addEventListener("pingme:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pingme:unauthorized", handleUnauthorized);
  }, []);

  // Auto-initialize encryption keys seamlessly in background
  useEffect(() => {
    if (auth && !myPrivateKey) {
      initSodium().then(() => {
        const stored = loadStoredPrivateKey();
        if (stored) {
          setMyPrivateKey(stored);
        } else {
          const { privateKey, publicKey } = deriveKeyFromUserId(auth.userId);
          storePrivateKey(privateKey);
          setMyPrivateKey(privateKey);
          api.publishKey(auth.accessToken, publicKey).catch(() => {});
        }
      });
    }
  }, [auth, myPrivateKey]);

  // Convert activeMembers to MemberResponseDto for ChatView / Direct Chats compatibility
  const chatMembers = useMemo(() => {
    return activeMembers.map((m) => ({
      userId: m.userId,
      username: m.username,
      email: m.email || "",
      role: m.role as any,
      joinedAt: m.joinedAt,
      avatarUrl: m.avatarUrl,
      isSuspended: m.isSuspended,
      managedGroupIds: m.managedGroupIds || [],
    }));
  }, [activeMembers]);

  // 1. Auth Screens
  if (!auth) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AuthScreen onAuth={handleAuth} />
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        {/* Main Application Container */}
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Rail 1: Organization Switcher Rail */}
          <OrgRail
            orgs={myOrgs}
            activeOrg={activeOrgDto}
            username={auth.username}
            onSwitch={(org: OrganizationResponseDto) => {
              switchOrg(org);
              setActiveView("overview");
            }}
            onAddOrg={() => setActiveView("workspace_hub")}
          />

          {/* If user has no active organization, show In-Place Workspace Creation / Join */}
          {!activeOrg ? (
            <WorkspaceHubView
              hasActiveOrg={false}
              onCreateWorkspace={async (name, description, logoUrl, industry, slug, starterChannels) => {
                await createOrg({
                  name,
                  description,
                  logoUrl,
                  industry,
                  slug,
                  starterChannels,
                });
                setActiveView("overview");
                setToast(`Workspace "${name}" successfully created!`);
              }}
              onJoinWorkspace={async (code) => {
                if (!auth?.token) return;
                const res = await api.orgs.joinByCode(auth.token, code);
                switchOrg(res);
                setActiveView("overview");
                setToast(`Successfully joined "${res.name}"!`);
              }}
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%" }}>
              {/* Header */}
              <OrgHeader
                org={activeOrg}
                allOrgs={myOrgs.map((o) => buildFullOrganization(o))}
                myUserId={auth.userId}
                myRole={currentRole}
                activeView={activeView}
                memberCount={activeMembers.length}
                username={auth.username}
                connStatus={chat.connStatus}
                themeKey={themeKey}
                unreadCounts={chat.unreadCounts}
                onSelectTheme={setThemeKey}
                onSwitchOrg={(targetOrg: FullOrganization) => {
                  const target = myOrgs.find((o) => o.id === targetOrg.id);
                  if (target) switchOrg(target);
                }}
                onCreateOrg={() => setActiveView("workspace_hub")}
                onOpenSettings={() => setActiveView("settings")}
                onLogout={handleLogout}
                searchQuery={globalSearch}
                onSearchChange={setGlobalSearch}
                onBackToChannels={() => setActiveView("channels")}
                onStartDm={async (uid) => {
                  await chat.openOrCreateDm(uid);
                  setActiveView("chat");
                }}
                onOpenGroup={(g) => {
                  chat.openChat({
                    kind: "group",
                    chat: {
                      id: g.id,
                      organizationId: g.organizationId,
                      name: g.name,
                      description: g.description,
                      topic: g.topic,
                      visibility: g.visibility,
                      createdBy: g.createdBy,
                      groupManagerId: g.groupManagerId,
                      groupManagerName: g.groupManagerName,
                      members: g.memberUserIds.map((uid: string) => ({
                        userId: uid,
                        username: activeOrg.members.find((m) => m.userId === uid)?.username || uid,
                        joinedAt: g.createdAt,
                      })),
                      createdAt: g.createdAt,
                      updatedAt: g.createdAt,
                    },
                  });
                  setActiveView("chat");
                }}
                onOpenMyProfile={() => {
                  const me = activeOrg.members.find((m) => m.userId === auth.userId);
                  if (me) setSelectedProfileMember(me);
                }}
              />

              {/* Main Content Workspace Split */}
              <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
                {/* Left Navigation: Channels, DMs, Directory */}
                <Box sx={{ display: { xs: activeView === "channels" ? "flex" : "none", md: "flex" }, height: "100%", width: { xs: "100%", md: "auto" }, minWidth: { xs: "100%", md: "auto" } }}>
                  <OrgLeftNav
                    org={activeOrg}
                    activeView={activeView}
                    onSelectView={setActiveView}
                    directChats={chat.directChats}
                    activeChat={chat.activeChat}
                    unreadCounts={chat.unreadCounts}
                    onlineUsers={chat.onlineUsers}
                    myUserId={auth.userId}
                    myRole={currentRole}
                    ticketSystemEnabled={activeOrg.ticketSystemEnabled}
                    onOpenChat={(targetChat) => {
                      chat.openChat(targetChat);
                      setActiveView("chat");
                    }}
                    onStartDm={async (targetUserId) => {
                      await chat.openOrCreateDm(targetUserId);
                      setActiveView("chat");
                    }}
                    onCreateGroup={() => setActiveView("create_channel")}
                    onOpenSettings={() => setActiveView("settings")}
                  />
                </Box>

                {/* Primary Central Content Area */}
                <Box sx={{ display: { xs: activeView === "channels" ? "none" : "flex", md: "flex" }, flexGrow: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
              {(activeView === "overview" || activeView === "channels") && activeOrgDto && (
                <OverviewView
                  org={activeOrgDto}
                  members={chatMembers}
                  groups={chat.groups}
                  username={auth.username}
                  themeKey={themeKey}
                  onlineCount={activeMembers.filter((m) => m.userId === auth.userId || chat.onlineUsers.has(m.userId)).length}
                  onlineUsers={chat.onlineUsers}
                  currentUserId={auth.userId}
                  onOpenGeneralChat={() => {
                    const general = chat.groups.find((g) => g.name.toLowerCase() === "general") || chat.groups[0];
                    if (general) {
                      chat.openChat({
                        kind: "group",
                        chat: {
                          id: general.id,
                          organizationId: general.organizationId,
                          name: general.name,
                          description: general.description,
                          topic: general.topic,
                          visibility: general.visibility,
                          createdBy: general.createdBy,
                          groupManagerId: general.groupManagerId,
                          groupManagerName: general.groupManagerName,
                          members: general.members || [],
                          createdAt: general.createdAt,
                          updatedAt: general.updatedAt || general.createdAt,
                        },
                      });
                    }
                    setActiveView("chat");
                  }}
                  onOpenMembersSection={() => setActiveView("members")}
                  onOpenFilesSection={() => setActiveView("files")}
                  onOpenActivitySection={() => setActiveView("activity")}
                  onStartDm={async (uid) => {
                    await chat.openOrCreateDm(uid);
                    setActiveView("chat");
                  }}
                />
              )}

              {activeView === "chat" && (
                <ChatView
                  activeChat={chat.activeChat}
                  messages={chat.activeChat ? chat.messages[chat.activeChat.kind === "dm" ? chat.activeChat.chat.id : chat.activeChat.chat.id] || [] : []}
                  userId={auth.userId}
                  username={auth.username}
                  members={chatMembers}
                  connStatus={chat.connStatus}
                  typingUserIds={chat.activeChat ? Array.from(chat.typingUsers[chat.activeChat.kind === "dm" ? chat.activeChat.chat.id : chat.activeChat.chat.id] || []) : []}
                  onlineUsers={chat.onlineUsers}
                  onSend={chat.sendMessage}
                  onSendFile={chat.sendFile}
                  onTyping={chat.sendTyping}
                  onEditMessage={chat.editMessage}
                  onDeleteMessage={chat.deleteMessage}
                  onReactMessage={chat.reactToMessage}
                  onOpenProfile={(uid) => {
                    const m = activeOrg.members.find((x) => x.userId.toLowerCase() === uid.toLowerCase());
                    if (m) setSelectedProfileMember(m);
                  }}
                  onStartCall={(type) => {
                    if (!chat.activeChat) return;
                    const activeChatData = chat.activeChat;
                    const targetUserId =
                      activeChatData.kind === "dm"
                        ? (activeChatData.chat as import("./lib/api").DirectChat).otherUserId
                        : null;
                    if (targetUserId) {
                      startCall(targetUserId, activeChatData.chat.id, type);
                    }
                  }}
                  onStartScreenShare={startScreenShare}
                  callActive={callState.status !== "idle"}
                  onOpenTicket={async (ticketNumber) => {
                    const cleanNum = ticketNumber.replace(/^#/, "").trim();
                    const t = await tickets.getTicketByNumber(cleanNum);
                    if (t) {
                      setSelectedTicketId(t.id);
                      setActiveView("tickets");
                    } else {
                      setToast(`Ticket #${cleanNum} not found.`);
                    }
                  }}
                  hasMoreOlder={chat.hasMoreOlder}
                  loadingOlder={chat.loadingOlder}
                  onLoadOlder={chat.loadOlderHistory}
                  onBack={() => setActiveView("channels")}
                />
              )}

              {activeView === "members" && (
                <MembersView
                  org={activeOrg}
                  currentUserId={auth.userId}
                  currentUserRole={currentRole}
                  onlineUsers={chat.onlineUsers}
                  onOpenInvite={() => setOrgModal("invite")}
                  onSelectMember={(m) => setSelectedProfileMember(m)}
                />
              )}

              {activeView === "groups" && (
                <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3.5 }, overflowY: "auto" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <div>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        Channels Directory
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Browse public workspace channels and assigned private projects.
                      </Typography>
                    </div>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setActiveView("create_channel")}
                      sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", px: 2 }}
                    >
                      + Create Channel
                    </Button>
                  </Box>

                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {activeOrg.groups.map((g) => (
                      <Paper
                        key={g.id}
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          borderRadius: "10px",
                          bgcolor: "background.paper",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                              #{g.name}
                            </Typography>
                            {g.visibility === "private" && (
                              <Chip label="Private" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700 }} />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "13px" }}>
                            {g.description || "General channel discussions and updates."}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {g.memberUserIds.length} members
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              chat.openChat({
                                kind: "group",
                                chat: {
                                  id: g.id,
                                  organizationId: g.organizationId,
                                  name: g.name,
                                  description: g.description,
                                  topic: g.topic,
                                  visibility: g.visibility,
                                  createdBy: g.createdBy,
                                  groupManagerId: g.groupManagerId,
                                  groupManagerName: g.groupManagerName,
                                  members: g.memberUserIds.map((uid) => ({
                                    userId: uid,
                                    username: activeOrg.members.find((m) => m.userId === uid)?.username || uid,
                                    joinedAt: g.createdAt,
                                  })),
                                  createdAt: g.createdAt,
                                  updatedAt: g.createdAt,
                                },
                              });
                              setActiveView("chat");
                            }}
                            sx={{ textTransform: "none", fontWeight: 700, fontSize: "11.5px", py: 0.3, px: 1.5, borderRadius: "6px" }}
                          >
                            Open Channel
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {activeView === "create_channel" && activeOrg && (
                <CreateChannelView
                  org={activeOrg}
                  myUserId={auth.userId}
                  onBack={() => setActiveView("overview")}
                  onCreateGroup={async (groupData: any) => {
                    const newGrp = await createGroup(groupData);
                    return newGrp;
                  }}
                  onChannelCreated={(newGrp: any) => {
                    setToast(`Channel #${newGrp?.name || "new-channel"} created!`);
                    if (newGrp) {
                      chat.openChat({
                        kind: "group",
                        chat: {
                          id: newGrp.id,
                          organizationId: newGrp.organizationId,
                          name: newGrp.name,
                          description: newGrp.description,
                          topic: newGrp.topic,
                          visibility: newGrp.visibility,
                          createdBy: newGrp.createdBy,
                          groupManagerId: newGrp.groupManagerId,
                          groupManagerName: newGrp.groupManagerName,
                          members: (newGrp.memberUserIds || []).map((uid: string) => ({
                            userId: uid,
                            username: activeOrg.members.find((m) => m.userId === uid)?.username || uid,
                            joinedAt: newGrp.createdAt,
                          })),
                          createdAt: newGrp.createdAt,
                          updatedAt: newGrp.createdAt,
                        },
                      });
                      setActiveView("chat");
                    } else {
                      setActiveView("overview");
                    }
                  }}
                />
              )}

              {activeView === "files" && activeOrgDto && (
                <FilesView
                  org={activeOrgDto}
                  members={chatMembers}
                  messages={chat.messages}
                  authToken={auth.token}
                  currentUserId={auth.userId}
                />
              )}
              {activeView === "activity" && activeOrgDto && (
                <ActivityView org={activeOrgDto} myRole={currentRole} authToken={auth.token} />
              )}

              {activeView === "workspace_hub" && (
                <WorkspaceHubView
                  hasActiveOrg={true}
                  onBackToWorkspace={() => setActiveView("overview")}
                  onCreateWorkspace={async (name, description, logoUrl, industry, slug, starterChannels) => {
                    await createOrg({
                      name,
                      description,
                      logoUrl,
                      industry,
                      slug,
                      starterChannels,
                    });
                    setActiveView("overview");
                    setToast(`Workspace "${name}" successfully created!`);
                  }}
                  onJoinWorkspace={async (code) => {
                    if (!auth?.token) return;
                    const res = await api.orgs.joinByCode(auth.token, code);
                    switchOrg(res);
                    setActiveView("overview");
                    setToast(`Successfully joined "${res.name}"!`);
                  }}
                />
              )}

              {activeView === "settings" && activeOrg && (
                <WorkspaceSettingsView
                  org={activeOrg}
                  myUserId={auth.userId}
                  myRole={currentRole}
                  onBackToOverview={() => setActiveView("overview")}
                  onUpdateOrg={async (updates) => {
                    await updateOrg(updates as any);
                    setToast("Organization details updated.");
                  }}
                  onUpdateMemberRole={async (uid, newRole) => {
                    await updateMemberRole(uid, newRole as OrgRole);
                    setToast("Role assigned successfully.");
                  }}
                  onToggleSuspendMember={async (uid) => {
                    await toggleSuspendMember(uid);
                    setToast("Member status updated.");
                  }}
                  onRemoveMember={async (uid) => {
                    await removeMember(uid);
                    setToast("Member removed from workspace.");
                  }}
                  onTransferOwnership={async (uid) => {
                    await transferOwnership(uid);
                    setToast("Workspace ownership surrendered.");
                  }}
                  onUpdatePolicies={async (policies) => {
                    await updateOrg({ policies: { ...activeOrg.policies, ...policies } as any });
                    setToast("Security policies saved.");
                  }}
                  onResendInvite={async (inviteId) => {
                    await resendInvite(inviteId);
                    setToast("Invitation email resent.");
                  }}
                  onRevokeInvite={async (inviteId) => {
                    await revokeInvite(inviteId);
                    setToast("Invitation revoked.");
                  }}
                  onDeleteOrg={async () => {
                    await deleteOrg();
                    setActiveView("overview");
                    setToast("Organization permanently deleted.");
                  }}
                  onOpenInviteModal={() => setOrgModal("invite")}
                  onCreateGroupModal={() => setActiveView("create_channel")}
                  ticketSystemEnabled={activeOrg.ticketSystemEnabled}
                  onToggleTicketSystem={async (enabled) => {
                    await toggleTicketSystem(enabled);
                    setToast(enabled ? "Ticket system enabled." : "Ticket system disabled.");
                  }}
                />
              )}

              {activeView === "tickets" && activeOrg && (
                <TicketsView
                  orgId={activeOrg.id}
                  token={auth?.token || ""}
                  members={activeOrg.members}
                  myUserId={auth.userId}
                  myRole={currentRole}
                  tickets={tickets.tickets}
                  totalPages={tickets.totalPages}
                  currentPage={tickets.currentPage}
                  loading={tickets.loading}
                  error={tickets.error}
                  activeTicket={tickets.activeTicket}
                  loadingTicket={tickets.loadingTicket}
                  onLoadTickets={tickets.loadTickets}
                  onGetTicketDetail={tickets.getTicketDetail}
                  onCreateTicket={tickets.createTicket}
                  onUpdateTicket={tickets.updateTicket}
                  onDeleteTicket={tickets.deleteTicket}
                  onAddComment={tickets.addComment}
                  onAddAttachment={tickets.addAttachment}
                  initialTicketId={selectedTicketId}
                />
              )}

              {/* Side Panel Inspector for Member Profile (Slack-style In-Place Side View) */}
              {selectedProfileMember && activeOrg && (
                <MemberProfilePanel
                  member={selectedProfileMember}
                  myUserId={auth.userId}
                  myRole={currentRole}
                  orgOwnerId={activeOrg.ownerId}
                  groups={activeOrg.groups}
                  authToken={auth.token}
                  onClose={() => setSelectedProfileMember(null)}
                  onStartDm={async (uid) => {
                    await chat.openOrCreateDm(uid);
                    setActiveView("chat");
                  }}
                  onRoleChange={async (uid, newRole) => {
                    await updateMemberRole(uid, newRole as OrgRole);
                    setToast("Role updated.");
                  }}
                  onToggleSuspend={async (uid) => {
                    await toggleSuspendMember(uid);
                    setToast("Status updated.");
                  }}
                  onRemoveMember={async (uid) => {
                    await removeMember(uid);
                    setSelectedProfileMember(null);
                    setToast("Member removed.");
                  }}
                  onTransferOwnership={async (uid) => {
                    await transferOwnership(uid);
                    setToast("Ownership transferred.");
                  }}
                  onUpdateAvatar={(newUrl) => {
                    if (auth) {
                      const updated = { ...auth, avatarUrl: newUrl };
                      storeAuth(updated);
                      setAuth(updated);
                    }
                    setToast("Profile photo updated!");
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>

        {/* 1. Workspace Invite Teammates Modal */}
        {orgModal === "invite" && activeOrg && (
          <InviteModal
            orgId={activeOrg.id}
            orgName={activeOrg.name}
            joinCode={activeOrg.joinCode}
            groups={activeOrg.groups}
            onClose={() => setOrgModal(null)}
            onSendInvites={async (invitations) => {
              await sendInvites(invitations as any);
              setToast("Invitations sent successfully!");
            }}
          />
        )}

        {/* 2. Acceptance of Preview Invite Token */}
        {orgModal === "invite_accept" && previewInviteToken && (
          <InvitationAcceptModal
            token={previewInviteToken}
            onClose={() => {
              setOrgModal(null);
              setPreviewInviteToken(null);
            }}
            onAccepted={(newOrg) => {
              switchOrg(newOrg);
              setOrgModal(null);
              setPreviewInviteToken(null);
              setToast(`Welcome to ${newOrg.name}!`);
            }}
          />
        )}

        {/* Call Overlay — rings, active call, or outgoing dialing */}
        {callState.status !== "idle" && (
          <CallView
            callState={callState}
            localStream={localStream}
            remoteStream={remoteStream}
            onAccept={acceptCall}
            onDecline={declineCall}
            onHangup={hangup}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onStartScreenShare={startScreenShare}
            onStopScreenShare={stopScreenShare}
          />
        )}

        {/* Toast Notifications */}
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </Box>
    </ThemeProvider>
  );
}