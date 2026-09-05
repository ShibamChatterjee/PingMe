using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class OrganizationInviteRepository : IOrganizationInviteRepository
{
    private readonly IMongoCollection<OrganizationInvite> _invites;

    public OrganizationInviteRepository(MongoDbContext context)
    {
        _invites = context.GetCollection<OrganizationInvite>("organizationInvites");
    }

    public async Task<OrganizationInvite?> GetByIdAsync(string inviteId)
        => await _invites.Find(i => i.Id == inviteId).FirstOrDefaultAsync();

    public async Task<OrganizationInvite?> GetByTokenAsync(string token)
        => await _invites.Find(i => i.Token == token).FirstOrDefaultAsync();

    public async Task<List<OrganizationInvite>> GetPendingForOrgAsync(string orgId)
        => await _invites.Find(i => i.OrganizationId == orgId && i.Status == InviteStatus.Pending).ToListAsync();

    public async Task<List<OrganizationInvite>> GetAllForOrgAsync(string orgId)
        => await _invites.Find(i => i.OrganizationId == orgId).SortByDescending(i => i.CreatedAt).ToListAsync();

    public async Task CreateAsync(OrganizationInvite invite)
        => await _invites.InsertOneAsync(invite);

    public async Task UpdateStatusAsync(string inviteId, InviteStatus status)
    {
        var update = Builders<OrganizationInvite>.Update.Set(i => i.Status, status);
        await _invites.UpdateOneAsync(i => i.Id == inviteId, update);
    }

    public async Task UpdateAsync(OrganizationInvite invite)
    {
        await _invites.ReplaceOneAsync(i => i.Id == invite.Id, invite);
    }
}