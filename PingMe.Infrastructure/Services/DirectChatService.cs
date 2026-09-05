using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;

namespace PingMe.Infrastructure.Services;

public class DirectChatService : IDirectChatService
{
    private readonly IDirectChatRepository _chatRepo;
    private readonly IOrganizationMemberRepository _memberRepo;
    private readonly IUserRepository _userRepo;

    public DirectChatService(
        IDirectChatRepository chatRepo,
        IOrganizationMemberRepository memberRepo,
        IUserRepository userRepo)
    {
        _chatRepo = chatRepo;
        _memberRepo = memberRepo;
        _userRepo = userRepo;
    }

    public async Task<DirectChatDto> GetOrCreateAsync(string orgId, string requesterId, string targetUserId)
    {
        // 1. Validate both users belong to the org
        if (!await _memberRepo.IsMemberAsync(orgId, requesterId))
            throw new UnauthorizedAccessException("Requesting user is not a member of this organization.");

        if (!await _memberRepo.IsMemberAsync(orgId, targetUserId))
            throw new InvalidOperationException("Target user is not a member of this organization.");

        if (requesterId == targetUserId)
            throw new InvalidOperationException("Cannot create a DM with yourself.");

        // 2. Find or create
        var chat = await _chatRepo.FindAsync(orgId, requesterId, targetUserId);
        if (chat is null)
        {
            chat = await _chatRepo.CreateAsync(new DirectChat
            {
                OrganizationId = orgId,
                User1Id = requesterId,
                User2Id = targetUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return await ToDtoAsync(chat, requesterId);
    }

    public async Task<List<DirectChatDto>> GetUserChatsAsync(string orgId, string userId)
    {
        if (!await _memberRepo.IsMemberAsync(orgId, userId))
            throw new UnauthorizedAccessException("User is not a member of this organization.");

        var chats = await _chatRepo.GetUserChatsAsync(orgId, userId);

        var dtos = new List<DirectChatDto>();
        foreach (var c in chats)
            dtos.Add(await ToDtoAsync(c, userId));

        return dtos;
    }

    public async Task<DirectChatDto?> GetByIdAsync(string chatId, string orgId, string userId)
    {
        var chat = await _chatRepo.GetByIdAsync(chatId, orgId);
        if (chat is null) return null;

        // Only participants can access
        if (chat.User1Id != userId && chat.User2Id != userId) return null;

        return await ToDtoAsync(chat, userId);
    }

    private async Task<DirectChatDto> ToDtoAsync(DirectChat chat, string myUserId)
    {
        var otherUserId = chat.User1Id == myUserId ? chat.User2Id : chat.User1Id;
        var otherUser = await _userRepo.GetByIdAsync(otherUserId);

        return new DirectChatDto
        {
            Id = chat.Id,
            OrganizationId = chat.OrganizationId,
            OtherUserId = otherUserId,
            OtherUsername = otherUser?.Username ?? otherUserId,
            OtherAvatarUrl = otherUser?.AvatarUrl,
            UpdatedAt = chat.UpdatedAt,
            CreatedAt = chat.CreatedAt
        };
    }
}
