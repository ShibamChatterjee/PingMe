using MongoDB.Driver;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;
using PingMe.Infrastructure.Data;

namespace PingMe.Infrastructure.Repositories;

public class OrganizationRepository : IOrganizationRepository
{
    private readonly IMongoCollection<Organization> _orgs;

    public OrganizationRepository(MongoDbContext context)
    {
        _orgs = context.GetCollection<Organization>("organizations");
    }

    public async Task<Organization?> GetByIdAsync(string id)
        => await _orgs.Find(o => o.Id == id).FirstOrDefaultAsync();

    public async Task<Organization?> GetBySlugAsync(string slug)
        => await _orgs.Find(o => o.Slug == slug).FirstOrDefaultAsync();

    public async Task<Organization?> GetByJoinCodeAsync(string joinCode)
        => await _orgs.Find(o => o.JoinCode == joinCode && o.JoinCodeEnabled).FirstOrDefaultAsync();

    public async Task<bool> SlugExistsAsync(string slug)
        => await _orgs.Find(o => o.Slug == slug).AnyAsync();

    public async Task CreateAsync(Organization org)
        => await _orgs.InsertOneAsync(org);

    public async Task UpdateAsync(Organization org)
        => await _orgs.ReplaceOneAsync(o => o.Id == org.Id, org);

    public async Task DeleteAsync(string id)
        => await _orgs.DeleteOneAsync(o => o.Id == id);

    public async Task UpdateJoinCodeAsync(string orgId, string? joinCode, bool enabled)
    {
        var update = Builders<Organization>.Update
            .Set(o => o.JoinCode, joinCode)
            .Set(o => o.JoinCodeEnabled, enabled);
        await _orgs.UpdateOneAsync(o => o.Id == orgId, update);
    }
}