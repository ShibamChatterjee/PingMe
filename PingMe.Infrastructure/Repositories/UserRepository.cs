using System.Linq.Expressions;
using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(MongoDbContext context)
    {
        _users = context.GetCollection<User>("users");
    }

    public async Task<User?> GetByEmailAsync(string email)
        => await _users.Find(u => u.Email == email).FirstOrDefaultAsync();

    public async Task<User?> GetByIdAsync(string id)
        => await _users.Find(u => u.Id == id).FirstOrDefaultAsync();

    public async Task<List<User>> GetByIdsAsync(IEnumerable<string> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return new List<User>();
        return await _users.Find(u => idList.Contains(u.Id)).ToListAsync();
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId)
        => await _users.Find(u => u.GoogleId == googleId).FirstOrDefaultAsync();

    public async Task<bool> EmailExistsAsync(string email)
        => await _users.Find(u => u.Email == email).AnyAsync();

    public async Task CreateAsync(User user)
        => await _users.InsertOneAsync(user);
    
    public async Task UpdateFieldAsync<TField>(string userId, Expression<Func<User, TField>> field, TField value)
    {
        var update = Builders<User>.Update.Set(field, value);
        await _users.UpdateOneAsync(u => u.Id == userId, update);
    }

    public async Task<List<User>> SearchUsersAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<User>();

        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression(query, "i")),
            Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression(query, "i"))
        );

        return await _users.Find(filter).Limit(20).ToListAsync();
    }
}