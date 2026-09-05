namespace PingMe.Core.DTOs;

public class SendEncryptedMessageDto
{
    public string ConversationId { get; set; } = default!;
    public string Ciphertext { get; set; } = default!;
    public string Nonce { get; set; } = default!;
    public string? SelfCiphertext { get; set; }
    public string? SelfNonce { get; set; }
    public string? Type { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
}