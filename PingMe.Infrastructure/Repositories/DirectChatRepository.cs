using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class DirectChatRepository : IDirectChatRepository
{
    private readonly IMongoCollection<DirectChat> _chats;

    public DirectChatRepository(MongoDbContext context)
    {
        _chats = context.GetCollection<DirectChat>("direct_chats");
    }

    public async Task<DirectChat?> FindAsync(string orgId, string user1Id, string user2Id)
    {
        return await _chats.Find(c =>
            c.OrganizationId == orgId &&
            ((c.User1Id == user1Id && c.User2Id == user2Id) ||
             (c.User1Id == user2Id && c.User2Id == user1Id))).FirstOrDefaultAsync();
    }

    public async Task<DirectChat> CreateAsync(DirectChat chat)
    {
        var (u1, u2) = SortedPair(chat.User1Id, chat.User2Id);
        chat.User1Id = u1;
        chat.User2Id = u2;
        chat.Id = ObjectId.GenerateNewId().ToString();
        await _chats.InsertOneAsync(chat);
        return chat;
    }

    public async Task<List<DirectChat>> GetUserChatsAsync(string orgId, string userId)
    {
        return await _chats
            .Find(c => c.OrganizationId == orgId &&
                       (c.User1Id == userId || c.User2Id == userId))
            .SortByDescending(c => c.UpdatedAt)
            .ToListAsync();
    }

    public async Task<DirectChat?> GetByIdAsync(string chatId, string orgId)
    {
        return await _chats
            .Find(c => c.Id == chatId && c.OrganizationId == orgId)
            .FirstOrDefaultAsync();
    }

    public async Task UpdateLastMessageAsync(string chatId, string messageId, DateTime updatedAt)
    {
        await _chats.UpdateOneAsync(
            Builders<DirectChat>.Filter.Eq(c => c.Id, chatId),
            Builders<DirectChat>.Update
                .Set(c => c.LastMessageId, messageId)
                .Set(c => c.UpdatedAt, updatedAt));
    }

    private static (string, string) SortedPair(string a, string b)
        => string.CompareOrdinal(a, b) <= 0 ? (a, b) : (b, a);
}
