using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using PingMe.Api.Hubs;
using PingMe.Core.DTOs;
using StackExchange.Redis;

namespace PingMe.Api.BackgroundServices;

public class NotificationSubscriberService : IHostedService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IHubContext<ChatHub> _hub;
    private ISubscriber? _subscriber;

    public NotificationSubscriberService(IConnectionMultiplexer redis, IHubContext<ChatHub> hub)
    {
        _redis = redis;
        _hub = hub;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _subscriber = _redis.GetSubscriber();

        await _subscriber.SubscribeAsync(
            RedisChannel.Literal(Infrastructure.Services.NotificationService.ChannelName),
            async (_, message) =>
            {
                try
                {
                    var notification = JsonSerializer.Deserialize<MessageNotificationDto>(message!);
                    if (notification is null) return;

                    await _hub.Clients.User(notification.RecipientId)
                        .SendAsync("ReceiveNotification", notification);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"NotificationSubscriberService error: {ex}");
                }
            });
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_subscriber is not null)
            await _subscriber.UnsubscribeAllAsync();
    }
}