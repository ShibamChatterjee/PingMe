using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IGroupMemberRepository
{
    Task AddAsync(GroupMember member);
    Task RemoveAsync(string groupId, string userId);
    Task<List<GroupMember>> GetGroupMembersAsync(string groupId);
    Task<List<GroupMember>> GetUserGroupMembershipsAsync(string userId);
    Task<bool> IsMemberAsync(string groupId, string userId);
}
