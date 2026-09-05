namespace PingMe.Core.Models;

/// <summary>
/// Kept as a stub so the old ConversationService can be compiled during migration.
/// Will be fully removed once DirectChat + Group replace all usages.
/// </summary>
[Obsolete("Use DirectChat or Group instead. Scheduled for removal.")]
public class Conversation
{
    public string Id { get; set; } = default!;
    public string Type { get; set; } = "dm";
    public string? Name { get; set; }
    public string CreatedBy { get; set; } = default!;
    public List<string> ParticipantIds { get; set; } = new();
    public string? LastMessageId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}