using System.Text.Json;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using StackExchange.Redis;

namespace PingMe.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IDatabase _redis;
    private readonly ISubscriber _pubsub;

    public const string ChannelName = "pingme:notifications";

    private static string UnreadKey(string userId) => $"unread:{userId}";

    public NotificationService(IConnectionMultiplexer redis)
    {
        _redis = redis.GetDatabase();
        _pubsub = redis.GetSubscriber();
    }

    public async Task PublishNewMessageAsync(MessageNotificationDto notification)
    {
        // 1. Persist unread count — survives across reconnects/refresh,
        //    independent of whether the recipient is online right now.
        await _redis.HashIncrementAsync(
            UnreadKey(notification.RecipientId),
            notification.ConversationId,
            1);

        // 2. Broadcast for real-time delivery. Any server instance with
        //    the recipient's SignalR connection picks this up.
        var payload = JsonSerializer.Serialize(notification);
        await _pubsub.PublishAsync(RedisChannel.Literal(ChannelName), payload);
    }

    public async Task<List<UnreadCountDto>> GetUnreadCountsAsync(string userId)
    {
        var hash = await _redis.HashGetAllAsync(UnreadKey(userId));
        return hash
            .Select(e => new UnreadCountDto
            {
                ConversationId = e.Name.ToString(),
                Count = (int)e.Value
            })
            .Where(c => c.Count > 0)
            .ToList();
    }

    public async Task MarkConversationReadAsync(string userId, string conversationId)
    {
        await _redis.HashDeleteAsync(UnreadKey(userId), conversationId);
    }
}