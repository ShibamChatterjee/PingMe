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

    public async Task<List<Message>> GetHistoryAsync(string orgId, string chatId, string requesterId, int limit = 50, DateTime? before = null)
    {
        // Security: verify org membership
        if (!await _orgMemberRepo.IsMemberAsync(orgId, requesterId))
            throw new UnauthorizedAccessException("Access denied.");

        limit = Math.Clamp(limit, 1, 200);

        // Fetch from MongoDB — always filter by orgId for security
        var filterBuilder = Builders<Message>.Filter;
        var filter = filterBuilder.Eq(m => m.ChatId, chatId) & filterBuilder.Eq(m => m.OrganizationId, orgId);

        // Filter out messages deleted for this user
        filter &= !filterBuilder.AnyEq(m => m.DeletedForUserIds, requesterId);

        if (before.HasValue)
        {
            filter &= filterBuilder.Lt(m => m.SentAt, before.Value);
        }

        var messages = await _messages
            .Find(filter)
            .SortByDescending(m => m.SentAt)
            .Limit(limit)
            .ToListAsync();

        return messages.OrderBy(m => m.SentAt).ToList();
    }

    public async Task<Message?> EditAsync(
        string orgId,
        string chatId,
        string messageId,
        string senderId,
        string ciphertext,
        string nonce,
        string? selfCiphertext = null,
        string? selfNonce = null)
    {
        if (!await _orgMemberRepo.IsMemberAsync(orgId, senderId))
            throw new UnauthorizedAccessException("Access denied.");

        var message = await _messages.Find(m => m.Id == messageId && m.OrganizationId == orgId && m.ChatId == chatId).FirstOrDefaultAsync();
        if (message is null) return null;

        if (!string.Equals(message.SenderId, senderId, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You can only edit your own messages.");

        if (message.IsDeleted)
            throw new InvalidOperationException("Cannot edit a deleted message.");

        var now = DateTime.UtcNow;
        var update = Builders<Message>.Update
            .Set(m => m.Ciphertext, ciphertext)
            .Set(m => m.Nonce, nonce)
            .Set(m => m.SelfCiphertext, selfCiphertext)
            .Set(m => m.SelfNonce, selfNonce)
            .Set(m => m.IsEdited, true)
            .Set(m => m.EditedAt, now);

        await _messages.UpdateOneAsync(m => m.Id == messageId, update);

        message.Ciphertext = ciphertext;
        message.Nonce = nonce;
        message.SelfCiphertext = selfCiphertext;
        message.SelfNonce = selfNonce;
        message.IsEdited = true;
        message.EditedAt = now;

        return message;
    }

    public async Task<Message?> DeleteAsync(
        string orgId,
        string chatId,
        string messageId,
        string requesterId,
        bool deleteForEveryone)
    {
        if (!await _orgMemberRepo.IsMemberAsync(orgId, requesterId))
            throw new UnauthorizedAccessException("Access denied.");

        var message = await _messages.Find(m => m.Id == messageId && m.OrganizationId == orgId && m.ChatId == chatId).FirstOrDefaultAsync();
        if (message is null) return null;

        if (deleteForEveryone)
        {
            if (!string.Equals(message.SenderId, requesterId, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("You can only delete your own messages for everyone.");

            var update = Builders<Message>.Update
                .Set(m => m.IsDeleted, true)
                .Set(m => m.Ciphertext, "")
                .Set(m => m.Nonce, "")
                .Set(m => m.SelfCiphertext, null)
                .Set(m => m.SelfNonce, null)
                .Set(m => m.FileUrl, null)
                .Set(m => m.FileName, null)
                .Set(m => m.FileType, null)
                .Set(m => m.FileSize, null);

            await _messages.UpdateOneAsync(m => m.Id == messageId, update);

            message.IsDeleted = true;
            message.Ciphertext = "";
            message.Nonce = "";
            message.SelfCiphertext = null;
            message.SelfNonce = null;
            message.FileUrl = null;
            message.FileName = null;
        }
        else
        {
            // Delete for me
            var update = Builders<Message>.Update.AddToSet(m => m.DeletedForUserIds, requesterId);
            await _messages.UpdateOneAsync(m => m.Id == messageId, update);
            if (!message.DeletedForUserIds.Contains(requesterId))
                message.DeletedForUserIds.Add(requesterId);
        }

        return message;
    }

    public async Task<Dictionary<string, List<string>>> ReactAsync(
        string orgId,
        string chatId,
        string messageId,
        string requesterId,
        string emoji)
    {
        if (!await _orgMemberRepo.IsMemberAsync(orgId, requesterId))
            throw new UnauthorizedAccessException("Access denied.");

        var message = await _messages.Find(m => m.Id == messageId && m.OrganizationId == orgId && m.ChatId == chatId).FirstOrDefaultAsync();
        if (message is null) return new Dictionary<string, List<string>>();

        if (message.Reactions == null)
            message.Reactions = new Dictionary<string, List<string>>();

        if (message.Reactions.TryGetValue(emoji, out var userList))
        {
            if (userList.Contains(requesterId))
            {
                userList.Remove(requesterId);
                if (userList.Count == 0)
                {
                    message.Reactions.Remove(emoji);
                }
            }
            else
            {
                userList.Add(requesterId);
            }
        }
        else
        {
            message.Reactions[emoji] = new List<string> { requesterId };
        }

        var update = Builders<Message>.Update.Set(m => m.Reactions, message.Reactions);
        await _messages.UpdateOneAsync(m => m.Id == messageId, update);

        return message.Reactions;
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
            if (chat is null || (!string.Equals(chat.User1Id, senderId, StringComparison.OrdinalIgnoreCase) &&
                                 !string.Equals(chat.User2Id, senderId, StringComparison.OrdinalIgnoreCase)))
                throw new UnauthorizedAccessException("Sender is not a participant in this chat.");
        }
    }
}