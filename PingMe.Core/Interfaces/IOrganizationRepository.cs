using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IOrganizationRepository
{
    Task<Organization?> GetByIdAsync(string id);
    Task<Organization?> GetBySlugAsync(string slug);
    Task<Organization?> GetByJoinCodeAsync(string joinCode);
    Task<bool> SlugExistsAsync(string slug);
    Task CreateAsync(Organization org);
    Task UpdateAsync(Organization org);
    Task DeleteAsync(string id);
    Task UpdateJoinCodeAsync(string orgId, string? joinCode, bool enabled);
}