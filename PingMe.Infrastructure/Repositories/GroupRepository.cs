using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly IMongoCollection<Group> _groups;
    private readonly IMongoCollection<GroupMember> _members;

    public GroupRepository(MongoDbContext context)
    {
        _groups = context.GetCollection<Group>("groups");
        _members = context.GetCollection<GroupMember>("group_members");
    }

    public async Task<Group> CreateAsync(Group group)
    {
        if (string.IsNullOrEmpty(group.Id))
        {
            group.Id = ObjectId.GenerateNewId().ToString();
        }
        await _groups.InsertOneAsync(group);
        return group;
    }

    public async Task<Group?> GetByIdAsync(string groupId, string orgId)
    {
        return await _groups
            .Find(g => g.Id == groupId && g.OrganizationId == orgId)
            .FirstOrDefaultAsync();
    }

    public async Task<List<Group>> GetUserGroupsAsync(string orgId, string userId)
    {
        // Find group IDs where user is a member
        var memberships = await _members
            .Find(m => m.OrganizationId == orgId && m.UserId == userId)
            .ToListAsync();

        var groupIds = memberships.Select(m => m.GroupId).ToList();

        if (!groupIds.Any()) return new List<Group>();

        return await _groups
            .Find(g => g.OrganizationId == orgId && groupIds.Contains(g.Id))
            .SortByDescending(g => g.UpdatedAt)
            .ToListAsync();
    }

    public async Task<List<Group>> GetAllForOrgAsync(string orgId)
    {
        return await _groups
            .Find(g => g.OrganizationId == orgId)
            .SortByDescending(g => g.UpdatedAt)
            .ToListAsync();
    }

    public async Task<int> GetGroupCountAsync(string orgId)
    {
        return (int)await _groups.CountDocumentsAsync(g => g.OrganizationId == orgId);
    }

    public async Task UpdateAsync(Group group)
    {
        await _groups.ReplaceOneAsync(g => g.Id == group.Id && g.OrganizationId == group.OrganizationId, group);
    }

    public async Task DeleteAsync(string groupId, string orgId)
    {
        await _groups.DeleteOneAsync(g => g.Id == groupId && g.OrganizationId == orgId);
        await _members.DeleteManyAsync(m => m.GroupId == groupId && m.OrganizationId == orgId);
    }

    public async Task UpdateLastMessageAsync(string groupId, string messageId, DateTime updatedAt)
    {
        await _groups.UpdateOneAsync(
            Builders<Group>.Filter.Eq(g => g.Id, groupId),
            Builders<Group>.Update
                .Set(g => g.LastMessageId, messageId)
                .Set(g => g.UpdatedAt, updatedAt));
    }
}
