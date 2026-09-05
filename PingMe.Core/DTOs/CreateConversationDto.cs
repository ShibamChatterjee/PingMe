namespace PingMe.Core.DTOs;

public class CreateConversationDto
{
    public string Type { get; set; } = "dm";
    public string? Name { get; set; }
    public List<string> ParticipantIds { get; set; } = new();
}