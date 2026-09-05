using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IDirectChatRepository
{
    Task<DirectChat?> FindAsync(string orgId, string user1Id, string user2Id);
    Task<DirectChat> CreateAsync(DirectChat chat);
    Task<List<DirectChat>> GetUserChatsAsync(string orgId, string userId);
    Task<DirectChat?> GetByIdAsync(string chatId, string orgId);
    Task UpdateLastMessageAsync(string chatId, string messageId, DateTime updatedAt);
}
