using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace PingMe.Core.Models 
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = default!;
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string? PasswordHash { get; set; }
        public string AuthProvider { get; set; } = "local"; // "local" | "google"
        public string? GoogleId { get; set; }
        public string? AvatarUrl { get; set; }
        public string Status { get; set; } = "offline";
        public DateTime LastSeen { get; set; }
        public string? IdentityPublicKey { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}