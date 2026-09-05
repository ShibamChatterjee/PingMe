using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public enum OrgRole { Owner = 0, Manager = 1, Member = 2 }

public class OrganizationMember
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public OrgRole Role { get; set; } = OrgRole.Member;
    public string? Department { get; set; }
    public string? Title { get; set; }
    public bool IsSuspended { get; set; } = false;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}