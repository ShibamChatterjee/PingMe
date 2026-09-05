using PingMe.Core.DTOs;
using PingMe.Core.Models;

namespace PingMe.Core.Interfaces;

public interface IMessageService
{
    /// <summary>
    /// Saves a message with org context. Validates sender belongs to the org
    /// and is a participant in the chat before persisting.
    /// </summary>
    Task<Message> SaveAsync(
        string orgId,
        string chatId,
        string chatType,
        string senderId,
        string ciphertext,
        string nonce,
        string? selfCiphertext = null,
        string? selfNonce = null,
        string type = "text",
        string? fileUrl = null,
        string? fileName = null,
        string? fileType = null,
        long? fileSize = null);

    /// <summary>
    /// Returns message history for a chat. Validates the requesting user
    /// belongs to the org and is a participant in the chat.
    /// </summary>
    Task<List<Message>> GetHistoryAsync(string orgId, string chatId, string requesterId, int limit = 50);
}