using MongoDB.Bson;
using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class GroupMemberRepository : IGroupMemberRepository
{
    private readonly IMongoCollection<GroupMember> _members;

    public GroupMemberRepository(MongoDbContext context)
    {
        _members = context.GetCollection<GroupMember>("group_members");
    }

    public async Task AddAsync(GroupMember member)
    {
        member.Id = ObjectId.GenerateNewId().ToString();
        await _members.InsertOneAsync(member);
    }

    public async Task RemoveAsync(string groupId, string userId)
    {
        await _members.DeleteOneAsync(m => m.GroupId == groupId && m.UserId == userId);
    }

    public async Task<List<GroupMember>> GetGroupMembersAsync(string groupId)
    {
        return await _members
            .Find(m => m.GroupId == groupId)
            .ToListAsync();
    }

    public async Task<List<GroupMember>> GetUserGroupMembershipsAsync(string userId)
    {
        return await _members
            .Find(m => m.UserId == userId)
            .ToListAsync();
    }

    public async Task<bool> IsMemberAsync(string groupId, string userId)
    {
        return await _members
            .Find(m => m.GroupId == groupId && m.UserId == userId)
            .AnyAsync();
    }
}
