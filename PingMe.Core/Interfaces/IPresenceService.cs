namespace PingMe.Core.Interfaces;

public interface IPresenceService
{
    Task SetOnlineAsync(string userId, string connectionId);
    Task SetOfflineAsync(string userId);
    Task<List<string>> GetOnlineUsersAsync();
}