using PingMe.Core.Models;

namespace PingMe.Core.DTOs;

public class CreateOrganizationDto
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? LogoUrl { get; set; }
    public string? Slug { get; set; }
    public List<string>? StarterChannels { get; set; }
}

public class UpdateOrganizationDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? LogoUrl { get; set; }
    public string? Slug { get; set; }
    public WorkspacePolicies? Policies { get; set; }
}

public class OrganizationResponseDto
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? LogoUrl { get; set; }
    public string OwnerId { get; set; } = default!;
    public string OwnerName { get; set; } = default!;
    public string? JoinCode { get; set; }
    public bool JoinCodeEnabled { get; set; } = true;
    public bool TicketSystemEnabled { get; set; } = false;
    public WorkspacePolicies Policies { get; set; } = new();
    public OrgRole MyRole { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class InviteByEmailDto
{
    public string Email { get; set; } = default!;
    public OrgRole Role { get; set; } = OrgRole.Member;
    public List<string> InitialGroupIds { get; set; } = new();
}

public class BatchInviteDto
{
    public List<InviteByEmailDto> Invites { get; set; } = new();
}

public class InviteResponseDto
{
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public OrgRole Role { get; set; }
    public string InvitedByUserId { get; set; } = default!;
    public string InvitedByUsername { get; set; } = default!;
    public List<string> InitialGroupIds { get; set; } = new();
    public InviteStatus Status { get; set; }
    public string Token { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class InvitePreviewDto
{
    public string OrganizationId { get; set; } = default!;
    public string OrganizationName { get; set; } = default!;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string InviterName { get; set; } = default!;
    public OrgRole Role { get; set; }
    public List<string> InitialGroupNames { get; set; } = new();
    public int MemberCount { get; set; }
    public int GroupCount { get; set; }
}

public class MemberResponseDto
{
    public string UserId { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    public OrgRole Role { get; set; }
    public string? Department { get; set; }
    public string? Title { get; set; }
    public bool IsSuspended { get; set; }
    public List<string> ManagedGroupIds { get; set; } = new();
    public DateTime JoinedAt { get; set; }
}

public class TransferOwnershipDto
{
    public string NewOwnerUserId { get; set; } = default!;
}

public class WorkspaceFileDto
{
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string ChatId { get; set; } = default!;
    public string ChatType { get; set; } = default!;
    public string? ChatName { get; set; }
    public string SenderId { get; set; } = default!;
    public string SenderUsername { get; set; } = default!;
    public string? SenderAvatarUrl { get; set; }
    public string FileName { get; set; } = default!;
    public string FileUrl { get; set; } = default!;
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime SentAt { get; set; }
    public bool IsMe { get; set; }
}