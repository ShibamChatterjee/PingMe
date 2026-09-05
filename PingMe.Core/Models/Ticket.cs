using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TicketStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TicketPriority
{
    Low,
    Medium,
    High,
    Critical
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TicketCategory
{
    General,
    Bug,
    Feature,
    Technical,
    Question,
    Other
}

public class TicketAttachment
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string FileName { get; set; } = default!;
    public string FileUrl { get; set; } = default!;
    public string FileType { get; set; } = default!;
    public long FileSize { get; set; }
    public string UploadedBy { get; set; } = default!;
    public string UploadedByUsername { get; set; } = default!;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class TicketComment
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string AuthorUserId { get; set; } = default!;
    public string AuthorUsername { get; set; } = default!;
    public string? AuthorAvatarUrl { get; set; }
    public string Content { get; set; } = default!;
    public List<TicketAttachment> Attachments { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TicketActivity
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string ActorUserId { get; set; } = default!;
    public string ActorUsername { get; set; } = default!;
    public string? ActorAvatarUrl { get; set; }
    // e.g. ticket_created, ticket_assigned, ticket_status_changed, ticket_updated,
    //      ticket_completed, ticket_deleted, ticket_priority_changed, ticket_comment_added,
    //      ticket_attachment_added
    public string EventType { get; set; } = default!;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Ticket
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string TicketNumber { get; set; } = default!;   // e.g. "TKT-1001"
    public string WorkspaceId { get; set; } = default!;

    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;

    [BsonRepresentation(BsonType.String)]
    public TicketCategory Category { get; set; } = TicketCategory.General;

    // Open | InProgress | Resolved | Closed
    [BsonRepresentation(BsonType.String)]
    public TicketStatus Status { get; set; } = TicketStatus.Open;

    // Low | Medium | High | Critical
    [BsonRepresentation(BsonType.String)]
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;

    public string CreatedBy { get; set; } = default!;
    public string CreatedByUsername { get; set; } = default!;
    public string? CreatedByAvatarUrl { get; set; }

    public string? AssignedTo { get; set; }
    public string? AssignedToUsername { get; set; }
    public string? AssignedToAvatarUrl { get; set; }

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<TicketAttachment> Attachments { get; set; } = new();
    public List<TicketComment> Comments { get; set; } = new();
    public List<TicketActivity> ActivityLog { get; set; } = new();
}
