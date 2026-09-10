using PingMe.Core.Interfaces;
using StackExchange.Redis;

namespace PingMe.Infrastructure.Services;

public class PresenceService : IPresenceService
{
    private readonly IDatabase _redis;
    private static string Key(string userId) 
        => $"user:online:{userId}";

    public PresenceService(IConnectionMultiplexer redis)
    {
        _redis = redis.GetDatabase();
    }

    public async Task SetOnlineAsync(string userId, string connectionId)
    {
        await _redis.StringSetAsync(
            Key(userId), connectionId, TimeSpan.FromSeconds(30));
    }

    public async Task SetOfflineAsync(string userId)
    {
        await _redis.KeyDeleteAsync(Key(userId));
    }
    
    public Task<List<string>> GetOnlineUsersAsync()
    {
        var endpoints = _redis.Multiplexer.GetEndPoints();
        var server = _redis.Multiplexer.GetServer(endpoints.First());

        var keys = server.Keys(pattern: "user:online:*");
        var list = keys.Select(k => k.ToString().Replace("user:online:", "")).ToList();
        return Task.FromResult(list);
    }
}