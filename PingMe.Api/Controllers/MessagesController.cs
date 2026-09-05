using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MessagesController : ControllerBase
{
    private readonly IFileUploadService _fileUploadService;

    public MessagesController(IFileUploadService fileUploadService)
    {
        _fileUploadService = fileUploadService;
    }

    private static readonly HashSet<string> AllowedContentTypes = new()
    {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/webm", "video/quicktime",
        "application/pdf"
    };

    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    /// <summary>
    /// Upload a file attachment. Returns a URL to embed in a message.
    /// Message history is fetched via /organizations/{orgId}/direct-chats/{chatId}/messages
    /// or /organizations/{orgId}/groups/{groupId}/messages.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        if (file.Length > MaxFileSizeBytes)
            return BadRequest("File exceeds the 25 MB limit.");

        if (!AllowedContentTypes.Contains(file.ContentType))
            return BadRequest($"Unsupported file type: {file.ContentType}");

        await using var stream = file.OpenReadStream();
        var result = await _fileUploadService.UploadAsync(stream, file.FileName, file.ContentType);

        return Ok(result);
    }
}