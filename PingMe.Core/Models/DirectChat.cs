using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public class DirectChat
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string OrganizationId { get; set; } = default!;

    /// <summary>The two participants — always stored in consistent sorted order.</summary>
    public string User1Id { get; set; } = default!;
    public string User2Id { get; set; } = default!;

    public string? LastMessageId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
