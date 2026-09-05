using PingMe.Core.DTOs;

namespace PingMe.Core.Interfaces;

public interface IDirectChatService
{
    /// <summary>
    /// Gets an existing DM between the two users in the org, or creates one.
    /// Validates both users belong to the org.
    /// </summary>
    Task<DirectChatDto> GetOrCreateAsync(string orgId, string requesterId, string targetUserId);

    /// <summary>Returns all direct chats for the requesting user in the org.</summary>
    Task<List<DirectChatDto>> GetUserChatsAsync(string orgId, string userId);

    /// <summary>Returns a single direct chat by ID if the user is a participant.</summary>
    Task<DirectChatDto?> GetByIdAsync(string chatId, string orgId, string userId);
}
