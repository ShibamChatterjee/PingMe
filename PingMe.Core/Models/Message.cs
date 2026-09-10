using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public class Message
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    /// <summary>Organization this message belongs to — enforces isolation.</summary>
    public string OrganizationId { get; set; } = default!;

    /// <summary>ID of either a DirectChat or a Group.</summary>
    public string ChatId { get; set; } = default!;

    /// <summary>"dm" or "group"</summary>
    public string ChatType { get; set; } = "dm";

    public string SenderId { get; set; } = default!;
    public string Ciphertext { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string? SelfCiphertext { get; set; }
    public string? SelfNonce { get; set; }
    public string Type { get; set; } = "text";
    public string Status { get; set; } = "sent";
    public bool IsDeleted { get; set; }
    public List<string> DeletedForUserIds { get; set; } = new();
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public Dictionary<string, List<string>> Reactions { get; set; } = new();
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}