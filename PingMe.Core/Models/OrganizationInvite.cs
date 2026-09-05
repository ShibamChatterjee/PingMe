using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public enum InviteStatus { Pending, Accepted, Declined, Revoked, Expired }

public class OrganizationInvite
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;
    public string OrganizationId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string Token { get; set; } = default!;           // random, embedded in the invite link
    public OrgRole Role { get; set; } = OrgRole.Member;
    public string InvitedByUserId { get; set; } = default!;
    public List<string> InitialGroupIds { get; set; } = new();
    public InviteStatus Status { get; set; } = InviteStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
}