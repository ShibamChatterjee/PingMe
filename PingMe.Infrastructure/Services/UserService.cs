using Microsoft.Extensions.Configuration;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using StackExchange.Redis;

namespace PingMe.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _config;
    private readonly IDatabase _redis;

    private static string CacheKey(string userId)
        => $"user:profile:{userId}";

    public UserService(
        IUserRepository userRepo,
        IConfiguration config,
        IConnectionMultiplexer redis)
    {
        _userRepo = userRepo;
        _config = config;
        _redis = redis.GetDatabase();
    }

    public async Task<UserProfileResponseDto?> GetUserProfileAsync(string userId)
    {
        var key = CacheKey(userId);

        // 1. Check Redis Hash cache first
        var cached = await _redis.HashGetAllAsync(key);
        if (cached.Length > 0)
        {
            // Cache hit — map hash fields back to DTO
            var dict = cached.ToDictionary(
                e => e.Name.ToString(),
                e => e.Value.ToString());

            return new UserProfileResponseDto
            {
                Id = dict["id"],
                Username = dict["username"],
                Email = dict["email"],
                AvatarUrl = dict.GetValueOrDefault("avatarUrl"),
                CreatedAt = DateTime.Parse(dict["createdAt"])
            };
        }

        // 2. Cache miss — hit MongoDB
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) return null;

        var profile = new UserProfileResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt
        };

        // 3. Store each field as a hash entry
        await _redis.HashSetAsync(key, new HashEntry[]
        {
            new("id", profile.Id),
            new("username", profile.Username),
            new("email", profile.Email),
            new("avatarUrl", profile.AvatarUrl ?? ""),
            new("createdAt", profile.CreatedAt.ToString("O"))
        });

        // 4. Set expiry on the whole key (HashSet has no built-in TTL)
        await _redis.KeyExpireAsync(key, TimeSpan.FromMinutes(10));

        return profile;
    }
    public async Task PublishKeyAsync(
        string userId,
        string identityPublicKey)
    {
        Console.WriteLine(
            $"PublishKey userId={userId}"
        );

        Console.WriteLine(
            $"Public key length={identityPublicKey?.Length}"
        );

        var before = await _userRepo.GetByIdAsync(userId);

        Console.WriteLine(
            $"User before update: {before?.Id}"
        );

        await _userRepo.UpdateFieldAsync(
            userId,
            u => u.IdentityPublicKey,
            identityPublicKey);

        var after = await _userRepo.GetByIdAsync(userId);

        Console.WriteLine(
            $"User after update: {after?.Id}"
        );

        Console.WriteLine(
            $"Stored key length={after?.IdentityPublicKey?.Length}"
        );

        await _redis.KeyDeleteAsync(CacheKey(userId));
    }

    public async Task<string?> GetPublicKeyAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        return user?.IdentityPublicKey;
    }

    public async Task UpdateAvatarUrlAsync(string userId, string avatarUrl)
    {
        await _userRepo.UpdateFieldAsync(userId, u => u.AvatarUrl, avatarUrl);
        await _redis.KeyDeleteAsync(CacheKey(userId));
    }

    public async Task<List<UserProfileResponseDto>> SearchUsersAsync(string query)
    {
        var users = await _userRepo.SearchUsersAsync(query);
        return users.Select(u => new UserProfileResponseDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            AvatarUrl = u.AvatarUrl,
            CreatedAt = u.CreatedAt
        }).ToList();
    }
}
