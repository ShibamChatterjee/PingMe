using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;
using StackExchange.Redis;

namespace PingMe.Infrastructure.Services;

public class MessageService : IMessageService
{
    private readonly IMongoCollection<Message> _messages;
    private readonly IDirectChatRepository _directChatRepo;
    private readonly IGroupRepository _groupRepo;
    private readonly IGroupMemberRepository _groupMemberRepo;
    private readonly IOrganizationMemberRepository _orgMemberRepo;
    private readonly IDatabase _redis;

    // Redis cache key includes orgId to prevent cross-org cache collisions
    private static string CacheKey(string orgId, string chatId)
        => $"msg:cache:{orgId}:{chatId}";

    public MessageService(
        MongoDbContext context,
        IConnectionMultiplexer redis,
        IDirectChatRepository directChatRepo,
        IGroupRepository groupRepo,
        IGroupMemberRepository groupMemberRepo,
        IOrganizationMemberRepository orgMemberRepo)
    {
        _messages = context.GetCollection<Message>("messages");
        _redis = redis.GetDatabase();
        _directChatRepo = directChatRepo;
        _groupRepo = groupRepo;
        _groupMemberRepo = groupMemberRepo;
        _orgMemberRepo = orgMemberRepo;
    }

    public async Task<Message> SaveAsync(
        string orgId,
        string chatId,
        string chatType,
        string senderId,
        string ciphertext,
        string nonce,
        string? selfCiphertext = null,
        string? selfNonce = null,
        string type = "text",
        string? fileUrl = null,
        string? fileName = null,
        string? fileType = null,
        long? fileSize = null)
    {
        // Security: validate sender is in the org AND in the specific chat
        await ValidateSenderAccess(orgId, chatId, chatType, senderId);

        var message = new Message
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrganizationId = orgId,
            ChatId = chatId,
            ChatType = chatType,
            SenderId = senderId,
            Ciphertext = ciphertext,
            Nonce = nonce,
            SelfCiphertext = selfCiphertext,
            SelfNonce = selfNonce,
            Type = type,
            Status = "sent",
            FileUrl = fileUrl,
            FileName = fileName,
            FileType = fileType,
            FileSize = fileSize,
            SentAt = DateTime.UtcNow
        };

        // 1. Save to MongoDB
        await _messages.InsertOneAsync(message);

        // 2. Update chat's lastMessageId
        if (chatType == "dm")
            await _directChatRepo.UpdateLastMessageAsync(chatId, message.Id, message.SentAt);
        else
            await _groupRepo.UpdateLastMessageAsync(chatId, message.Id, message.SentAt);

        // 3. Cache in Redis ZSET
        var json = JsonSerializer.Serialize(message);
        var score = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var key = CacheKey(orgId, chatId);

        await _redis.SortedSetAddAsync(key, json, score);
        // Trim to last 50
        await _redis.SortedSetRemoveRangeByRankAsync(key, 0, -51);

        return message;
    }

    public async Task<List<Message>> GetHistoryAsync(string orgId, string chatId, string requesterId, int limit = 50)
    {
        // Security: verify org membership
        if (!await _orgMemberRepo.IsMemberAsync(orgId, requesterId))
            throw new UnauthorizedAccessException("Access denied.");

        var key = CacheKey(orgId, chatId);

        // 1. Try Redis cache
        var cached = await _redis.SortedSetRangeByRankAsync(key, 0, limit - 1, Order.Descending);

        if (cached.Length > 0)
        {
            return cached
                .Select(c => JsonSerializer.Deserialize<Message>(c.ToString())!)
                .OrderBy(m => m.SentAt)
                .ToList();
        }

        // 2. MongoDB fallback — always filter by orgId for security
        var messages = await _messages
            .Find(m => m.ChatId == chatId && m.OrganizationId == orgId)
            .SortByDescending(m => m.SentAt)
            .Limit(limit)
            .ToListAsync();

        if (messages.Count > 0)
        {
            var batch = messages.Select(m => new SortedSetEntry(
                JsonSerializer.Serialize(m),
                new DateTimeOffset(m.SentAt).ToUnixTimeMilliseconds()
            )).ToArray();

            await _redis.SortedSetAddAsync(key, batch);
        }

        return messages.OrderBy(m => m.SentAt).ToList();
    }

    private async Task ValidateSenderAccess(string orgId, string chatId, string chatType, string senderId)
    {
        if (!await _orgMemberRepo.IsMemberAsync(orgId, senderId))
            throw new UnauthorizedAccessException("Sender is not a member of this organization.");

        if (chatType == "group")
        {
            if (!await _groupMemberRepo.IsMemberAsync(chatId, senderId))
                throw new UnauthorizedAccessException("Sender is not a member of this group.");
        }
        else // dm
        {
            var chat = await _directChatRepo.GetByIdAsync(chatId, orgId);
            if (chat is null || (chat.User1Id != senderId && chat.User2Id != senderId))
                throw new UnauthorizedAccessException("Sender is not a participant in this chat.");
        }
    }
}