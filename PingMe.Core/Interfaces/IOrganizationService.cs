using PingMe.Core.DTOs;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IOrganizationService
{
    Task<OrganizationResponseDto> CreateAsync(string ownerId, CreateOrganizationDto dto);
    Task<OrganizationResponseDto?> GetByIdAsync(string orgId, string userId);
    Task<OrganizationResponseDto> UpdateAsync(string orgId, string requestingUserId, UpdateOrganizationDto dto);
    Task DeleteAsync(string orgId, string requestingUserId);
    Task TransferOwnershipAsync(string orgId, string requestingUserId, string newOwnerUserId);

    Task<List<OrganizationResponseDto>> GetMyOrganizationsAsync(string userId);
    Task<bool> IsMemberAsync(string orgId, string userId);
    Task<OrgRole?> GetRoleAsync(string orgId, string userId);

    Task<string> GenerateJoinCodeAsync(string orgId, string requestingUserId);
    Task DisableJoinCodeAsync(string orgId, string requestingUserId);
    Task<OrganizationResponseDto> JoinByCodeAsync(string joinCode, string userId);

    Task InviteByEmailAsync(string orgId, string invitedByUserId, InviteByEmailDto dto);
    Task<List<InviteResponseDto>> BatchInviteAsync(string orgId, string invitedByUserId, BatchInviteDto dto);
    Task<List<InviteResponseDto>> GetInvitesAsync(string orgId, string requestingUserId);
    Task ResendInviteAsync(string orgId, string requestingUserId, string inviteId);
    Task RevokeInviteAsync(string orgId, string requestingUserId, string inviteId);

    Task<InvitePreviewDto> GetInvitePreviewAsync(string token);
    Task<OrganizationResponseDto> AcceptInviteAsync(string token, string userId);
    Task DeclineInviteAsync(string token, string userId);

    Task<List<MemberResponseDto>> GetMembersAsync(string orgId);
    Task UpdateMemberRoleAsync(string orgId, string requestingUserId, string targetUserId, OrgRole role);
    Task ToggleMemberSuspensionAsync(string orgId, string requestingUserId, string targetUserId);
    Task RemoveMemberAsync(string orgId, string requestingUserId, string targetUserId);

    Task<List<WorkspaceFileDto>> GetWorkspaceFilesAsync(string orgId, string requestingUserId, string? filterUserId = null, string? fileType = null);
}