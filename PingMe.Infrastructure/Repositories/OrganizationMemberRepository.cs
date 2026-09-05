using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class OrganizationMemberRepository : IOrganizationMemberRepository
{
    private readonly IMongoCollection<OrganizationMember> _members;

    public OrganizationMemberRepository(MongoDbContext context)
    {
        _members = context.GetCollection<OrganizationMember>("organizationMembers");
    }

    public async Task<OrganizationMember?> GetAsync(string orgId, string userId)
        => await _members.Find(m => m.OrganizationId == orgId && m.UserId == userId).FirstOrDefaultAsync();

    public async Task<List<OrganizationMember>> GetOrgsForUserAsync(string userId)
        => await _members.Find(m => m.UserId == userId).ToListAsync();

    public async Task<List<OrganizationMember>> GetMembersForOrgAsync(string orgId)
        => await _members.Find(m => m.OrganizationId == orgId).ToListAsync();

    public async Task<int> GetMemberCountAsync(string orgId)
        => (int)await _members.CountDocumentsAsync(m => m.OrganizationId == orgId);

    public async Task<bool> IsMemberAsync(string orgId, string userId)
        => await _members.Find(m => m.OrganizationId == orgId && m.UserId == userId).AnyAsync();

    public async Task CreateAsync(OrganizationMember member)
        => await _members.InsertOneAsync(member);

    public async Task UpdateRoleAsync(string orgId, string userId, OrgRole role)
    {
        var update = Builders<OrganizationMember>.Update.Set(m => m.Role, role);
        await _members.UpdateOneAsync(m => m.OrganizationId == orgId && m.UserId == userId, update);
    }

    public async Task UpdateSuspensionAsync(string orgId, string userId, bool isSuspended)
    {
        var update = Builders<OrganizationMember>.Update.Set(m => m.IsSuspended, isSuspended);
        await _members.UpdateOneAsync(m => m.OrganizationId == orgId && m.UserId == userId, update);
    }

    public async Task RemoveAsync(string orgId, string userId)
        => await _members.DeleteOneAsync(m => m.OrganizationId == orgId && m.UserId == userId);

    public async Task DeleteAllForOrgAsync(string orgId)
        => await _members.DeleteManyAsync(m => m.OrganizationId == orgId);
}