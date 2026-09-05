using PingMe.Core.Models;

namespace PingMe.Core.DTOs;

// ── Request DTOs ─────────────────────────────────────────────────────────────

public class TicketAttachmentDto
{
    public string? Id { get; set; }
    public string FileName { get; set; } = default!;
    public string FileUrl { get; set; } = default!;
    public string? FileType { get; set; }
    public long FileSize { get; set; }
    public string? UploadedBy { get; set; }
    public string? UploadedByUsername { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class CreateTicketDto
{
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public TicketCategory Category { get; set; } = TicketCategory.General;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public string? AssignedTo { get; set; }
    public List<TicketAttachmentDto>? Attachments { get; set; }
}

public class UpdateTicketDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public TicketCategory? Category { get; set; }
    public TicketStatus? Status { get; set; }
    public TicketPriority? Priority { get; set; }
    public string? AssignedTo { get; set; }
}

public class AddTicketCommentDto
{
    public string Content { get; set; } = default!;
    public List<TicketAttachmentDto>? Attachments { get; set; }
}

public class TicketSettingsDto
{
    public bool Enabled { get; set; }
}

// ── Query Params ─────────────────────────────────────────────────────────────

public class TicketQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Category { get; set; }
    public string? AssignedTo { get; set; }
    public string? CreatedBy { get; set; }
    public string SortBy { get; set; } = "newest"; // newest | oldest
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class TicketCommentDto
{
    public string Id { get; set; } = default!;
    public string AuthorUserId { get; set; } = default!;
    public string AuthorUsername { get; set; } = default!;
    public string? AuthorAvatarUrl { get; set; }
    public string Content { get; set; } = default!;
    public List<TicketAttachmentDto> Attachments { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class TicketActivityDto
{
    public string Id { get; set; } = default!;
    public string ActorUserId { get; set; } = default!;
    public string ActorUsername { get; set; } = default!;
    public string? ActorAvatarUrl { get; set; }
    public string EventType { get; set; } = default!;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>List-view projection (no comments/activity)</summary>
public class TicketDto
{
    public string Id { get; set; } = default!;
    public string TicketNumber { get; set; } = default!;
    public string WorkspaceId { get; set; } = default!;
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public TicketCategory Category { get; set; } = TicketCategory.General;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public string CreatedBy { get; set; } = default!;
    public string CreatedByUsername { get; set; } = default!;
    public string? CreatedByAvatarUrl { get; set; }
    public string? AssignedTo { get; set; }
    public string? AssignedToUsername { get; set; }
    public string? AssignedToAvatarUrl { get; set; }
    public int CommentCount { get; set; }
    public int AttachmentCount { get; set; }
    public List<TicketAttachmentDto> Attachments { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Full detail including embedded comments and activity log</summary>
public class TicketDetailDto : TicketDto
{
    public List<TicketCommentDto> Comments { get; set; } = new();
    public List<TicketActivityDto> ActivityLog { get; set; } = new();
}

public class PagedTicketsResult
{
    public List<TicketDto> Items { get; set; } = new();
    public long TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
