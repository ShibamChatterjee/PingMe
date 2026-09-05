namespace PingMe.Core.DTOs;

public class MessageNotificationDto
{
    public string RecipientId { get; set; } = default!;
    public string ConversationId { get; set; } = default!;
    public string SenderId { get; set; } = default!;
    public string MessageId { get; set; } = default!;
    public DateTime SentAt { get; set; }
}

public class UnreadCountDto
{
    public string ConversationId { get; set; } = default!;
    public int Count { get; set; }
}