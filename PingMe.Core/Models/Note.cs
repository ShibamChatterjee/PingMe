using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using PingMe.Core.Enums;

namespace PingMe.Core.Models;

public class Note
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    public string Description { get; set; } = default!;

    [BsonRepresentation(BsonType.ObjectId)]
    public string OrgId { get; set; } = default!;

    public NoteType Type { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;
}
