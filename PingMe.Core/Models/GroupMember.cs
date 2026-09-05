using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public class GroupMember
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string GroupId { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
