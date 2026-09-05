using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Api.Filters;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgId}/tickets")]
[Authorize]
[RequireOrgMembership]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/organizations/{orgId}/tickets
    [HttpGet]
    public async Task<IActionResult> List(
        string orgId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? category = null,
        [FromQuery] string? assignedTo = null,
        [FromQuery] string? createdBy = null,
        [FromQuery] string sortBy = "newest")
    {
        try
        {
            var query = new TicketQueryParams
            {
                Page = page, PageSize = Math.Min(pageSize, 100),
                Search = search, Status = status, Priority = priority,
                Category = category, AssignedTo = assignedTo, CreatedBy = createdBy, SortBy = sortBy,
            };
            var result = await _ticketService.ListAsync(orgId, UserId, query);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // POST /api/organizations/{orgId}/tickets
    [HttpPost]
    public async Task<IActionResult> Create(string orgId, [FromBody] CreateTicketDto dto)
    {
        try
        {
            var ticket = await _ticketService.CreateAsync(orgId, UserId, dto);
            return CreatedAtAction(nameof(GetById), new { orgId, ticketId = ticket.Id }, ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // GET /api/organizations/{orgId}/tickets/{ticketId}
    [HttpGet("{ticketId}")]
    public async Task<IActionResult> GetById(string orgId, string ticketId)
    {
        try
        {
            var ticket = await _ticketService.GetByIdAsync(orgId, ticketId, UserId);
            if (ticket is null) return NotFound(new { message = "Ticket not found." });
            return Ok(ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // GET /api/organizations/{orgId}/tickets/by-number/{ticketNumber}
    [HttpGet("by-number/{ticketNumber}")]
    public async Task<IActionResult> GetByTicketNumber(string orgId, string ticketNumber)
    {
        try
        {
            var ticket = await _ticketService.GetByTicketNumberAsync(orgId, ticketNumber, UserId);
            if (ticket is null) return NotFound(new { message = "Ticket not found." });
            return Ok(ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // PATCH /api/organizations/{orgId}/tickets/{ticketId}
    [HttpPatch("{ticketId}")]
    public async Task<IActionResult> Update(string orgId, string ticketId, [FromBody] UpdateTicketDto dto)
    {
        try
        {
            var ticket = await _ticketService.UpdateAsync(orgId, ticketId, UserId, dto);
            return Ok(ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // DELETE /api/organizations/{orgId}/tickets/{ticketId}
    [HttpDelete("{ticketId}")]
    public async Task<IActionResult> Delete(string orgId, string ticketId)
    {
        try
        {
            await _ticketService.DeleteAsync(orgId, ticketId, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // POST /api/organizations/{orgId}/tickets/{ticketId}/comments
    [HttpPost("{ticketId}/comments")]
    public async Task<IActionResult> AddComment(string orgId, string ticketId, [FromBody] AddTicketCommentDto dto)
    {
        try
        {
            var ticket = await _ticketService.AddCommentAsync(orgId, ticketId, UserId, dto);
            return Ok(ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // POST /api/organizations/{orgId}/tickets/{ticketId}/attachments
    [HttpPost("{ticketId}/attachments")]
    public async Task<IActionResult> AddAttachment(string orgId, string ticketId, [FromBody] TicketAttachmentDto dto)
    {
        try
        {
            var ticket = await _ticketService.AddAttachmentAsync(orgId, ticketId, UserId, dto);
            return Ok(ticket);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
