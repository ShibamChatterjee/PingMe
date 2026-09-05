using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IOrganizationMemberRepository
{
    Task<OrganizationMember?> GetAsync(string orgId, string userId);
    Task<List<OrganizationMember>> GetOrgsForUserAsync(string userId);
    Task<List<OrganizationMember>> GetMembersForOrgAsync(string orgId);
    Task<int> GetMemberCountAsync(string orgId);
    Task<bool> IsMemberAsync(string orgId, string userId);
    Task CreateAsync(OrganizationMember member);
    Task UpdateRoleAsync(string orgId, string userId, OrgRole role);
    Task UpdateSuspensionAsync(string orgId, string userId, bool isSuspended);
    Task RemoveAsync(string orgId, string userId);
    Task DeleteAllForOrgAsync(string orgId);
}