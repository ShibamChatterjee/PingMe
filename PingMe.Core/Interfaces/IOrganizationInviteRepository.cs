using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IOrganizationInviteRepository
{
    Task<OrganizationInvite?> GetByIdAsync(string inviteId);
    Task<OrganizationInvite?> GetByTokenAsync(string token);
    Task<List<OrganizationInvite>> GetPendingForOrgAsync(string orgId);
    Task<List<OrganizationInvite>> GetAllForOrgAsync(string orgId);
    Task CreateAsync(OrganizationInvite invite);
    Task UpdateStatusAsync(string inviteId, InviteStatus status);
    Task UpdateAsync(OrganizationInvite invite);
}