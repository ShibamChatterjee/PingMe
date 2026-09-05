using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    private readonly IPresenceService _presenceService;
    private readonly IDirectChatService _directChatService;
    private readonly IGroupService _groupService;
    private readonly INotificationService _notificationService;
    private readonly IOrganizationMemberRepository _orgMemberRepo;

    public ChatHub(
        IMessageService messageService,
        IPresenceService presenceService,
        IDirectChatService directChatService,
        IGroupService groupService,
        INotificationService notificationService,
        IOrganizationMemberRepository orgMemberRepo)
    {
        _messageService = messageService;
        _presenceService = presenceService;
        _directChatService = directChatService;
        _groupService = groupService;
        _notificationService = notificationService;
        _orgMemberRepo = orgMemberRepo;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier!;

        await _presenceService.SetOnlineAsync(userId, Context.ConnectionId);

        var onlineUsers = await _presenceService.GetOnlineUsersAsync();
        await Clients.Caller.SendAsync("OnlineUsers", onlineUsers);

        await Clients.Others.SendAsync("UserOnline", userId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        var userId = Context.UserIdentifier!;

        await _presenceService.SetOfflineAsync(userId);
        await Clients.Others.SendAsync("UserOffline", userId);

        await base.OnDisconnectedAsync(ex);
    }

    /// <summary>
    /// Client joins a SignalR group for a chat (DM or group).
    /// The SignalR group name is scoped: "{orgId}:{chatId}" to prevent cross-org leakage.
    /// Validates the user actually has access before adding them to the group.
    /// </summary>
    public async Task JoinChat(string orgId, string chatId, string chatType)
    {
        var userId = Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // Security: validate org membership
        if (!await _orgMemberRepo.IsMemberAsync(orgId, userId))
        {
            await Clients.Caller.SendAsync("Error", "Not a member of this organization.");
            return;
        }

        // Security: validate access to this specific chat
        bool hasAccess;
        if (chatType == "group")
            hasAccess = await _groupService.IsGroupMemberAsync(chatId, userId);
        else
        {
            var chat = await _directChatService.GetByIdAsync(chatId, orgId, userId);
            hasAccess = chat is not null;
        }

        if (!hasAccess)
        {
            await Clients.Caller.SendAsync("Error", "Access denied to this chat.");
            return;
        }

        // Scoped group name prevents cross-org message leakage
        var groupName = SignalRGroupName(orgId, chatId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Sends an encrypted message. The message is validated, persisted, and
    /// broadcast only to members of the org-scoped SignalR group.
    /// </summary>
    public async Task SendMessage(SendOrgMessageDto dto)
    {
        var senderId = Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // The service validates org + chat access internally
        var message = await _messageService.SaveAsync(
            dto.OrganizationId,
            dto.ChatId,
            dto.ChatType,
            senderId,
            dto.Ciphertext,
            dto.Nonce,
            dto.SelfCiphertext,
            dto.SelfNonce,
            dto.Type ?? "text",
            dto.FileUrl,
            dto.FileName,
            dto.FileType,
            dto.FileSize);

        var groupName = SignalRGroupName(dto.OrganizationId, dto.ChatId);

        await Clients.Group(groupName).SendAsync("ReceiveMessage", new
        {
            message.Id,
            message.OrganizationId,
            ChatId = message.ChatId,
            ChatType = message.ChatType,
            message.SenderId,
            message.Ciphertext,
            message.Nonce,
            message.SelfCiphertext,
            message.SelfNonce,
            message.Type,
            message.SentAt,
            message.FileUrl,
            message.FileName,
            message.FileType,
            message.FileSize
        });

        // Push notification to participants not in the SignalR group
        if (dto.ChatType == "dm")
        {
            var chat = await _directChatService.GetByIdAsync(dto.ChatId, dto.OrganizationId, senderId);
            if (chat is not null)
            {
                var recipientId = chat.OtherUserId;
                await _notificationService.PublishNewMessageAsync(new MessageNotificationDto
                {
                    RecipientId = recipientId,
                    ConversationId = dto.ChatId,
                    SenderId = senderId,
                    MessageId = message.Id,
                    SentAt = message.SentAt
                });
            }
        }
        else // group
        {
            var group = await _groupService.GetByIdAsync(dto.ChatId, dto.OrganizationId, senderId);
            if (group is not null)
            {
                foreach (var member in group.Members.Where(m => m.UserId != senderId))
                {
                    await _notificationService.PublishNewMessageAsync(new MessageNotificationDto
                    {
                        RecipientId = member.UserId,
                        ConversationId = dto.ChatId,
                        SenderId = senderId,
                        MessageId = message.Id,
                        SentAt = message.SentAt
                    });
                }
            }
        }
    }

    // Typing indicators — org-scoped
    public async Task StartTyping(string orgId, string chatId)
    {
        var userId = Context.UserIdentifier;
        var groupName = SignalRGroupName(orgId, chatId);
        await Clients.OthersInGroup(groupName)
            .SendAsync("UserTyping", userId, chatId);
    }

    public async Task StopTyping(string orgId, string chatId)
    {
        var userId = Context.UserIdentifier;
        var groupName = SignalRGroupName(orgId, chatId);
        await Clients.OthersInGroup(groupName)
            .SendAsync("UserStoppedTyping", userId, chatId);
    }

    // ── WebRTC Call Signaling ────────────────────────────────────────────────

    /// <summary>
    /// Initiates a call from the caller to the target user.
    /// Sends an incoming call notification with the SDP offer to the callee.
    /// callType: "audio" | "video"
    /// </summary>
    public async Task InitiateCall(string calleeUserId, string chatId, string callType, string sdpOffer)
    {
        var callerId = Context.UserIdentifier!;

        await Clients.User(calleeUserId).SendAsync("IncomingCall", new
        {
            CallerId = callerId,
            ChatId = chatId,
            CallType = callType,
            SdpOffer = sdpOffer,
        });
    }

    /// <summary>
    /// Sends the SDP answer from the callee back to the caller.
    /// </summary>
    public async Task AnswerCall(string callerUserId, string chatId, string sdpAnswer)
    {
        var calleeId = Context.UserIdentifier!;

        await Clients.User(callerUserId).SendAsync("CallAnswered", new
        {
            CalleeId = calleeId,
            ChatId = chatId,
            SdpAnswer = sdpAnswer,
        });
    }

    /// <summary>
    /// Relays a WebRTC ICE candidate to the target peer.
    /// </summary>
    public async Task SendIceCandidate(string targetUserId, string chatId, string candidate)
    {
        var senderId = Context.UserIdentifier!;

        await Clients.User(targetUserId).SendAsync("IceCandidate", new
        {
            SenderId = senderId,
            ChatId = chatId,
            Candidate = candidate,
        });
    }

    /// <summary>
    /// Notifies the caller that the callee declined the call.
    /// </summary>
    public async Task DeclineCall(string callerUserId, string chatId)
    {
        var calleeId = Context.UserIdentifier!;

        await Clients.User(callerUserId).SendAsync("CallDeclined", new
        {
            CalleeId = calleeId,
            ChatId = chatId,
        });
    }

    /// <summary>
    /// Notifies the other participant that this user ended the call.
    /// </summary>
    public async Task EndCall(string otherUserId, string chatId)
    {
        var enderId = Context.UserIdentifier!;

        await Clients.User(otherUserId).SendAsync("CallEnded", new
        {
            EnderId = enderId,
            ChatId = chatId,
        });
    }

    /// <summary>
    /// Notifies caller that callee is already in another call.
    /// </summary>
    public async Task BusyCall(string callerUserId, string chatId)
    {
        var calleeId = Context.UserIdentifier!;

        await Clients.User(callerUserId).SendAsync("CallBusy", new
        {
            CalleeId = calleeId,
            ChatId = chatId,
        });
    }

    /// <summary>Produces an org-scoped SignalR group name: "{orgId}:{chatId}"</summary>
    private static string SignalRGroupName(string orgId, string chatId)
        => $"{orgId}:{chatId}";
}