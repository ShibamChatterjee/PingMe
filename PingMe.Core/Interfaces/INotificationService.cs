using PingMe.Core.DTOs;

namespace PingMe.Core.Interfaces;

public interface INotificationService
{
    Task PublishNewMessageAsync(MessageNotificationDto notification);
    Task<List<UnreadCountDto>> GetUnreadCountsAsync(string userId);
    Task MarkConversationReadAsync(string userId, string conversationId);
}