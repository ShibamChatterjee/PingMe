using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Api.Filters;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgId}/direct-chats")]
[Authorize]
[RequireOrgMembership]
public class DirectChatsController : ControllerBase
{
    private readonly IDirectChatService _chatService;
    private readonly IMessageService _messageService;

    public DirectChatsController(IDirectChatService chatService, IMessageService messageService)
    {
        _chatService = chatService;
        _messageService = messageService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Get or create a DM with another org member.</summary>
    [HttpPost]
    public async Task<IActionResult> GetOrCreate(string orgId, [FromBody] GetOrCreateDirectChatDto dto)
    {
        try
        {
            var chat = await _chatService.GetOrCreateAsync(orgId, UserId, dto.TargetUserId);
            return Ok(chat);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    /// <summary>List all DMs for the current user in this org.</summary>
    [HttpGet]
    public async Task<IActionResult> List(string orgId)
    {
        try
        {
            var chats = await _chatService.GetUserChatsAsync(orgId, UserId);
            return Ok(chats);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    /// <summary>Get message history for a specific DM.</summary>
    [HttpGet("{chatId}/messages")]
    public async Task<IActionResult> GetMessages(string orgId, string chatId, [FromQuery] int limit = 50)
    {
        // Verify access to the specific DM
        var chat = await _chatService.GetByIdAsync(chatId, orgId, UserId);
        if (chat is null) return NotFound("Chat not found or access denied.");

        var messages = await _messageService.GetHistoryAsync(orgId, chatId, UserId, limit);
        return Ok(messages);
    }
}

public class GetOrCreateDirectChatDto
{
    public string TargetUserId { get; set; } = default!;
}
