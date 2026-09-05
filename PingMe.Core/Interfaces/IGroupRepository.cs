using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IGroupRepository
{
    Task<Group> CreateAsync(Group group);
    Task<Group?> GetByIdAsync(string groupId, string orgId);
    Task<List<Group>> GetUserGroupsAsync(string orgId, string userId);
    Task<List<Group>> GetAllForOrgAsync(string orgId);
    Task<int> GetGroupCountAsync(string orgId);
    Task UpdateAsync(Group group);
    Task DeleteAsync(string groupId, string orgId);
    Task UpdateLastMessageAsync(string groupId, string messageId, DateTime updatedAt);
}
