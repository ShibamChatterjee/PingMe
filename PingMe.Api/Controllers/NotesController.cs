using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Core.Enums;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgId}/notes")]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;

    public NotesController(INoteService noteService)
    {
        _noteService = noteService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>
    /// Get audit notes/logs for the organization. Strictly restricted to Organization Owner.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotes(
        [FromRoute] string? orgId,
        [FromHeader(Name = "X-Org-Id")] string? headerOrgId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] NoteType? type = null,
        [FromQuery] string? search = null)
    {
        var targetOrgId = !string.IsNullOrWhiteSpace(orgId) ? orgId : headerOrgId;
        if (string.IsNullOrWhiteSpace(targetOrgId))
        {
            return BadRequest(new { message = "Organization ID is required." });
        }

        try
        {
            var result = await _noteService.GetNotesAsync(targetOrgId, UserId, page, pageSize, type, search);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific note by ID. Strictly restricted to Organization Owner.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetNoteById(
        string id,
        [FromRoute] string? orgId,
        [FromHeader(Name = "X-Org-Id")] string? headerOrgId)
    {
        var targetOrgId = !string.IsNullOrWhiteSpace(orgId) ? orgId : headerOrgId;
        if (string.IsNullOrWhiteSpace(targetOrgId))
        {
            return BadRequest(new { message = "Organization ID is required." });
        }

        try
        {
            var note = await _noteService.GetNoteByIdAsync(id, targetOrgId, UserId);
            if (note is null) return NotFound(new { message = "Audit note not found." });
            return Ok(note);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }
}
