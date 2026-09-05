using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models;

public class WorkspacePolicies
{
    public bool AllowMemberGroupCreation { get; set; } = true;
    public bool AllowMemberInvites { get; set; } = false;
    public bool RestrictGuestDirectMessages { get; set; } = true;
}

public class Organization
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;          
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? LogoUrl { get; set; }
    public string OwnerId { get; set; } = default!;         
    public string? JoinCode { get; set; }                   
    public bool JoinCodeEnabled { get; set; } = true;
    public WorkspacePolicies Policies { get; set; } = new();
    public bool TicketSystemEnabled { get; set; } = false;
    public int TicketCounter { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}