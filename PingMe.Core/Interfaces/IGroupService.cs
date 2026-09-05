using PingMe.Core.DTOs;

namespace PingMe.Core.Interfaces;

public interface IGroupService
{
    /// <summary>Creates a new group in the org. Validates all member IDs belong to the org.</summary>
    Task<GroupDto> CreateAsync(string orgId, string creatorId, CreateGroupDto dto);

    /// <summary>Returns all groups the user is a member of in the org.</summary>
    Task<List<GroupDto>> GetUserGroupsAsync(string orgId, string userId);

    /// <summary>Returns a single group if the user is a member.</summary>
    Task<GroupDto?> GetByIdAsync(string groupId, string orgId, string userId);

    /// <summary>Adds a member. Validates both the requester and target belong to the org.</summary>
    Task AddMemberAsync(string groupId, string orgId, string requesterId, string targetUserId);

    /// <summary>Removes a member. Creator cannot be removed.</summary>
    Task RemoveMemberAsync(string groupId, string orgId, string requesterId, string targetUserId);

    /// <summary>Checks if a user is a member of a specific group.</summary>
    Task<bool> IsGroupMemberAsync(string groupId, string userId);
}
