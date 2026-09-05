using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;

namespace PingMe.Infrastructure.Services;

public class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepo;
    private readonly IOrganizationRepository _orgRepo;
    private readonly IOrganizationMemberRepository _memberRepo;
    private readonly IUserRepository _userRepo;

    public TicketService(
        ITicketRepository ticketRepo,
        IOrganizationRepository orgRepo,
        IOrganizationMemberRepository memberRepo,
        IUserRepository userRepo)
    {
        _ticketRepo = ticketRepo;
        _orgRepo = orgRepo;
        _memberRepo = memberRepo;
        _userRepo = userRepo;
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    public async Task<bool> GetTicketSystemEnabledAsync(string workspaceId)
    {
        var org = await _orgRepo.GetByIdAsync(workspaceId);
        return org?.TicketSystemEnabled ?? false;
    }

    public async Task SetTicketSystemEnabledAsync(string workspaceId, string userId, bool enabled)
    {
        var member = await _memberRepo.GetAsync(workspaceId, userId)
            ?? throw new UnauthorizedAccessException("You are not a member of this workspace.");

        if (member.Role != OrgRole.Owner && member.Role != OrgRole.Manager)
            throw new UnauthorizedAccessException("Only workspace Owners and Managers can change this setting.");

        var org = await _orgRepo.GetByIdAsync(workspaceId)
            ?? throw new InvalidOperationException("Workspace not found.");

        org.TicketSystemEnabled = enabled;
        await _orgRepo.UpdateAsync(org);
    }

    // ── Guard helpers ─────────────────────────────────────────────────────────

    private async Task<OrganizationMember> RequireMemberAsync(string workspaceId, string userId)
    {
        var member = await _memberRepo.GetAsync(workspaceId, userId);
        if (member is null || member.IsSuspended)
            throw new UnauthorizedAccessException("You are not an active member of this workspace.");
        return member;
    }

    private async Task RequireTicketSystemEnabledAsync(string workspaceId)
    {
        var org = await _orgRepo.GetByIdAsync(workspaceId);
        if (org == null || !org.TicketSystemEnabled)
            throw new InvalidOperationException("Ticket system is disabled for this workspace.");
    }

    private static bool IsAdminOrOwner(OrganizationMember member)
        => member.Role == OrgRole.Owner || member.Role == OrgRole.Manager;

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static TicketAttachmentDto MapAttachmentDto(TicketAttachment a) => new()
    {
        Id = a.Id,
        FileName = a.FileName,
        FileUrl = a.FileUrl,
        FileType = a.FileType,
        FileSize = a.FileSize,
        UploadedBy = a.UploadedBy,
        UploadedByUsername = a.UploadedByUsername,
        UploadedAt = a.UploadedAt,
    };

    private static TicketDto MapToDto(Ticket t) => new()
    {
        Id = t.Id,
        TicketNumber = t.TicketNumber,
        WorkspaceId = t.WorkspaceId,
        Title = t.Title,
        Description = t.Description,
        Category = t.Category,
        Status = t.Status,
        Priority = t.Priority,
        CreatedBy = t.CreatedBy,
        CreatedByUsername = t.CreatedByUsername,
        CreatedByAvatarUrl = t.CreatedByAvatarUrl,
        AssignedTo = t.AssignedTo,
        AssignedToUsername = t.AssignedToUsername,
        AssignedToAvatarUrl = t.AssignedToAvatarUrl,
        CommentCount = t.Comments.Count,
        AttachmentCount = t.Attachments.Count,
        Attachments = t.Attachments.Select(MapAttachmentDto).ToList(),
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
    };

    private static TicketDetailDto MapToDetailDto(Ticket t) => new()
    {
        Id = t.Id,
        TicketNumber = t.TicketNumber,
        WorkspaceId = t.WorkspaceId,
        Title = t.Title,
        Description = t.Description,
        Category = t.Category,
        Status = t.Status,
        Priority = t.Priority,
        CreatedBy = t.CreatedBy,
        CreatedByUsername = t.CreatedByUsername,
        CreatedByAvatarUrl = t.CreatedByAvatarUrl,
        AssignedTo = t.AssignedTo,
        AssignedToUsername = t.AssignedToUsername,
        AssignedToAvatarUrl = t.AssignedToAvatarUrl,
        CommentCount = t.Comments.Count,
        AttachmentCount = t.Attachments.Count,
        Attachments = t.Attachments.Select(MapAttachmentDto).ToList(),
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
        Comments = t.Comments.Select(c => new TicketCommentDto
        {
            Id = c.Id,
            AuthorUserId = c.AuthorUserId,
            AuthorUsername = c.AuthorUsername,
            AuthorAvatarUrl = c.AuthorAvatarUrl,
            Content = c.Content,
            Attachments = c.Attachments.Select(MapAttachmentDto).ToList(),
            CreatedAt = c.CreatedAt,
        }).ToList(),
        ActivityLog = t.ActivityLog
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new TicketActivityDto
            {
                Id = a.Id,
                ActorUserId = a.ActorUserId,
                ActorUsername = a.ActorUsername,
                ActorAvatarUrl = a.ActorAvatarUrl,
                EventType = a.EventType,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                CreatedAt = a.CreatedAt,
            }).ToList(),
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<TicketDetailDto> CreateAsync(string workspaceId, string userId, CreateTicketDto dto)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        var member = await RequireMemberAsync(workspaceId, userId);
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Title is required.");
        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Description is required.");

        // Atomic ticket number
        var counter = await _ticketRepo.IncrementCounterAsync(workspaceId);
        var ticketNumber = $"TKT-{counter:D4}";

        // Resolve optional assignee
        string? assigneeName = null;
        string? assigneeAvatar = null;
        if (!string.IsNullOrEmpty(dto.AssignedTo))
        {
            var assignee = await _userRepo.GetByIdAsync(dto.AssignedTo);
            assigneeName = assignee?.Username;
            assigneeAvatar = assignee?.AvatarUrl;
        }

        var ticket = new Ticket
        {
            TicketNumber = ticketNumber,
            WorkspaceId = workspaceId,
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Category = dto.Category,
            Priority = dto.Priority,
            Status = TicketStatus.Open,
            CreatedBy = userId,
            CreatedByUsername = user.Username,
            CreatedByAvatarUrl = user.AvatarUrl,
            AssignedTo = dto.AssignedTo,
            AssignedToUsername = assigneeName,
            AssignedToAvatarUrl = assigneeAvatar,
            ActivityLog = new List<TicketActivity>
            {
                new TicketActivity
                {
                    ActorUserId = userId,
                    ActorUsername = user.Username,
                    ActorAvatarUrl = user.AvatarUrl,
                    EventType = "ticket_created",
                    NewValue = ticketNumber,
                }
            }
        };

        if (!string.IsNullOrEmpty(dto.AssignedTo) && dto.AssignedTo != userId)
        {
            ticket.ActivityLog.Add(new TicketActivity
            {
                ActorUserId = userId,
                ActorUsername = user.Username,
                ActorAvatarUrl = user.AvatarUrl,
                EventType = "ticket_assigned",
                NewValue = assigneeName,
            });
        }

        if (dto.Attachments is { Count: > 0 })
        {
            ticket.Attachments = dto.Attachments.Select(a => new TicketAttachment
            {
                Id = !string.IsNullOrEmpty(a.Id) ? a.Id : MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                FileType = a.FileType ?? "application/octet-stream",
                FileSize = a.FileSize,
                UploadedBy = userId,
                UploadedByUsername = user.Username,
                UploadedAt = DateTime.UtcNow,
            }).ToList();

            ticket.ActivityLog.Add(new TicketActivity
            {
                ActorUserId = userId,
                ActorUsername = user.Username,
                ActorAvatarUrl = user.AvatarUrl,
                EventType = "ticket_attachment_added",
                NewValue = $"{ticket.Attachments.Count} attachment(s) attached",
            });
        }

        await _ticketRepo.CreateAsync(ticket);
        return MapToDetailDto(ticket);
    }

    public async Task<TicketDetailDto?> GetByIdAsync(string workspaceId, string ticketId, string userId)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        await RequireMemberAsync(workspaceId, userId);
        var ticket = await _ticketRepo.GetByIdAsync(ticketId, workspaceId);
        return ticket is null ? null : MapToDetailDto(ticket);
    }

    public async Task<TicketDetailDto?> GetByTicketNumberAsync(string workspaceId, string ticketNumber, string userId)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        await RequireMemberAsync(workspaceId, userId);
        ticketNumber = ticketNumber.Trim().TrimStart('#');
        var ticket = await _ticketRepo.GetByTicketNumberAsync(ticketNumber, workspaceId);
        return ticket is null ? null : MapToDetailDto(ticket);
    }

    public async Task<PagedTicketsResult> ListAsync(string workspaceId, string userId, TicketQueryParams query)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        await RequireMemberAsync(workspaceId, userId);

        var (items, total) = await _ticketRepo.ListAsync(workspaceId, query);
        var totalPages = (int)Math.Ceiling((double)total / query.PageSize);

        return new PagedTicketsResult
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalPages = totalPages,
        };
    }

    public async Task<TicketDetailDto> UpdateAsync(string workspaceId, string ticketId, string userId, UpdateTicketDto dto)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        var member = await RequireMemberAsync(workspaceId, userId);
        var user = await _userRepo.GetByIdAsync(userId)!;
        var ticket = await _ticketRepo.GetByIdAsync(ticketId, workspaceId)
            ?? throw new InvalidOperationException("Ticket not found.");

        bool isAdmin = IsAdminOrOwner(member);
        bool isCreator = ticket.CreatedBy == userId;

        // Role-gated field updates
        if (!string.IsNullOrEmpty(dto.Title))
        {
            if (!isAdmin && !isCreator)
                throw new UnauthorizedAccessException("Only the ticket creator or an admin can update the title.");
            if (dto.Title != ticket.Title)
            {
                AddActivity(ticket, userId, user!.Username, user.AvatarUrl, "ticket_updated",
                    $"Title: {ticket.Title}", $"Title: {dto.Title}");
                ticket.Title = dto.Title.Trim();
            }
        }

        if (!string.IsNullOrEmpty(dto.Description))
        {
            if (!isAdmin && !isCreator)
                throw new UnauthorizedAccessException("Only the ticket creator or an admin can update the description.");
            if (dto.Description != ticket.Description)
            {
                AddActivity(ticket, userId, user!.Username, user.AvatarUrl, "ticket_updated",
                    "Description changed", null);
                ticket.Description = dto.Description.Trim();
            }
        }

        if (dto.Category.HasValue && dto.Category.Value != ticket.Category)
        {
            if (!isAdmin && !isCreator)
                throw new UnauthorizedAccessException("Only the ticket creator or an admin can update the category.");

            AddActivity(ticket, userId, user!.Username, user.AvatarUrl, "ticket_updated",
                ticket.Category.ToString(), dto.Category.Value.ToString());
            ticket.Category = dto.Category.Value;
        }

        if (dto.Status.HasValue && dto.Status.Value != ticket.Status)
        {
            var oldStatus = ticket.Status.ToString();
            ticket.Status = dto.Status.Value;
            var eventType = ticket.Status == TicketStatus.Closed || ticket.Status == TicketStatus.Resolved
                ? "ticket_completed"
                : "ticket_status_changed";
            AddActivity(ticket, userId, user!.Username, user.AvatarUrl, eventType, oldStatus, ticket.Status.ToString());
        }

        if (dto.Priority.HasValue && dto.Priority.Value != ticket.Priority)
        {
            if (!isAdmin)
                throw new UnauthorizedAccessException("Only workspace admins can change ticket priority.");

            AddActivity(ticket, userId, user!.Username, user.AvatarUrl, "ticket_priority_changed",
                ticket.Priority.ToString(), dto.Priority.Value.ToString());
            ticket.Priority = dto.Priority.Value;
        }

        if (dto.AssignedTo is not null) // null = not provided, empty string = unassign
        {
            if (!isAdmin)
                throw new UnauthorizedAccessException("Only workspace admins can reassign tickets.");

            string? newAssigneeName = null;
            string? newAssigneeAvatar = null;
            if (!string.IsNullOrEmpty(dto.AssignedTo))
            {
                var assignee = await _userRepo.GetByIdAsync(dto.AssignedTo)
                    ?? throw new InvalidOperationException("Assignee user not found.");
                // Validate assignee is a workspace member
                var assigneeMember = await _memberRepo.GetAsync(workspaceId, dto.AssignedTo);
                if (assigneeMember is null)
                    throw new InvalidOperationException("Assignee must be a member of this workspace.");
                newAssigneeName = assignee.Username;
                newAssigneeAvatar = assignee.AvatarUrl;
            }

            if (dto.AssignedTo != ticket.AssignedTo)
            {
                AddActivity(ticket, userId, user!.Username, user.AvatarUrl, "ticket_assigned",
                    ticket.AssignedToUsername, newAssigneeName);
                ticket.AssignedTo = string.IsNullOrEmpty(dto.AssignedTo) ? null : dto.AssignedTo;
                ticket.AssignedToUsername = newAssigneeName;
                ticket.AssignedToAvatarUrl = newAssigneeAvatar;
            }
        }

        await _ticketRepo.UpdateAsync(ticket);
        return MapToDetailDto(ticket);
    }

    public async Task DeleteAsync(string workspaceId, string ticketId, string userId)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        var member = await RequireMemberAsync(workspaceId, userId);
        if (!IsAdminOrOwner(member))
            throw new UnauthorizedAccessException("Only workspace Owners and Managers can delete tickets.");

        var ticket = await _ticketRepo.GetByIdAsync(ticketId, workspaceId)
            ?? throw new InvalidOperationException("Ticket not found.");

        await _ticketRepo.SoftDeleteAsync(ticketId, workspaceId);
    }

    public async Task<TicketDetailDto> AddCommentAsync(string workspaceId, string ticketId, string userId, AddTicketCommentDto dto)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        await RequireMemberAsync(workspaceId, userId);
        var user = await _userRepo.GetByIdAsync(userId)!;

        if (string.IsNullOrWhiteSpace(dto.Content) && (dto.Attachments is null || dto.Attachments.Count == 0))
            throw new InvalidOperationException("Comment content or attachment is required.");

        var ticket = await _ticketRepo.GetByIdAsync(ticketId, workspaceId)
            ?? throw new InvalidOperationException("Ticket not found.");

        var comment = new TicketComment
        {
            AuthorUserId = userId,
            AuthorUsername = user!.Username,
            AuthorAvatarUrl = user.AvatarUrl,
            Content = dto.Content?.Trim() ?? string.Empty,
            Attachments = dto.Attachments?.Select(a => new TicketAttachment
            {
                Id = !string.IsNullOrEmpty(a.Id) ? a.Id : MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                FileType = a.FileType ?? "application/octet-stream",
                FileSize = a.FileSize,
                UploadedBy = userId,
                UploadedByUsername = user.Username,
                UploadedAt = DateTime.UtcNow,
            }).ToList() ?? new(),
        };

        ticket.Comments.Add(comment);
        ticket.UpdatedAt = DateTime.UtcNow;
        AddActivity(ticket, userId, user.Username, user.AvatarUrl, "ticket_comment_added",
            null, $"Comment by {user.Username}");

        await _ticketRepo.UpdateAsync(ticket);
        return MapToDetailDto(ticket);
    }

    public async Task<TicketDetailDto> AddAttachmentAsync(string workspaceId, string ticketId, string userId, TicketAttachmentDto dto)
    {
        await RequireTicketSystemEnabledAsync(workspaceId);
        await RequireMemberAsync(workspaceId, userId);
        var user = await _userRepo.GetByIdAsync(userId)!;

        var ticket = await _ticketRepo.GetByIdAsync(ticketId, workspaceId)
            ?? throw new InvalidOperationException("Ticket not found.");

        var attachment = new TicketAttachment
        {
            Id = !string.IsNullOrEmpty(dto.Id) ? dto.Id : MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            FileName = dto.FileName,
            FileUrl = dto.FileUrl,
            FileType = dto.FileType ?? "application/octet-stream",
            FileSize = dto.FileSize,
            UploadedBy = userId,
            UploadedByUsername = user!.Username,
            UploadedAt = DateTime.UtcNow,
        };

        ticket.Attachments.Add(attachment);
        ticket.UpdatedAt = DateTime.UtcNow;
        AddActivity(ticket, userId, user.Username, user.AvatarUrl, "ticket_attachment_added",
            null, $"Attached {attachment.FileName}");

        await _ticketRepo.UpdateAsync(ticket);
        return MapToDetailDto(ticket);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static void AddActivity(Ticket ticket, string actorId, string actorUsername,
        string? actorAvatar, string eventType, string? oldValue, string? newValue)
    {
        ticket.ActivityLog.Add(new TicketActivity
        {
            ActorUserId = actorId,
            ActorUsername = actorUsername,
            ActorAvatarUrl = actorAvatar,
            EventType = eventType,
            OldValue = oldValue,
            NewValue = newValue,
        });
    }
}
