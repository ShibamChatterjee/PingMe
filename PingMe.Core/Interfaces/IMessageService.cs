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
    Task<List<Message>> GetHistoryAsync(string orgId, string chatId, string requesterId, int limit = 50, DateTime? before = null);

    /// <summary>
    /// Edits a message. Validates the requesting user is the sender and the message is not deleted.
    /// </summary>
    Task<Message?> EditAsync(
        string orgId,
        string chatId,
        string messageId,
        string senderId,
        string ciphertext,
        string nonce,
        string? selfCiphertext = null,
        string? selfNonce = null);

    /// <summary>
    /// Deletes a message either for everyone (if sender) or just for the requesting user.
    /// </summary>
    Task<Message?> DeleteAsync(
        string orgId,
        string chatId,
        string messageId,
        string requesterId,
        bool deleteForEveryone);

    /// <summary>
    /// Adds or removes an emoji reaction for the requesting user on a message.
    /// </summary>
    Task<Dictionary<string, List<string>>> ReactAsync(
        string orgId,
        string chatId,
        string messageId,
        string requesterId,
        string emoji);
}