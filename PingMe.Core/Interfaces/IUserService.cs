using PingMe.Core.DTOs;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IUserService
{
    Task<UserProfileResponseDto?> GetUserProfileAsync(string userId);
    Task PublishKeyAsync(string userId, string identityPublicKey);
    Task<string?> GetPublicKeyAsync(string userId);
    Task UpdateAvatarUrlAsync(string userId, string avatarUrl);
    Task<List<UserProfileResponseDto>> SearchUsersAsync(string query);
}