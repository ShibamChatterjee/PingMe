using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Api.Filters;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/organizations/{orgId}/groups")]
[Authorize]
[RequireOrgMembership]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;
    private readonly IMessageService _messageService;

    public GroupsController(IGroupService groupService, IMessageService messageService)
    {
        _groupService = groupService;
        _messageService = messageService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Create a new group in this org.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(string orgId, [FromBody] CreateGroupDto dto)
    {
        try
        {
            var group = await _groupService.CreateAsync(orgId, UserId, dto);
            return Ok(group);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    /// <summary>List all groups the current user is a member of in this org.</summary>
    [HttpGet]
    public async Task<IActionResult> List(string orgId)
    {
        try
        {
            var groups = await _groupService.GetUserGroupsAsync(orgId, UserId);
            return Ok(groups);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    /// <summary>Get a specific group (must be a member).</summary>
    [HttpGet("{groupId}")]
    public async Task<IActionResult> Get(string orgId, string groupId)
    {
        var group = await _groupService.GetByIdAsync(groupId, orgId, UserId);
        if (group is null) return NotFound("Group not found or access denied.");
        return Ok(group);
    }

    /// <summary>Get message history for a group.</summary>
    [HttpGet("{groupId}/messages")]
    public async Task<IActionResult> GetMessages(string orgId, string groupId, [FromQuery] int limit = 50, [FromQuery] DateTime? before = null)
    {
        // Verify group membership
        var group = await _groupService.GetByIdAsync(groupId, orgId, UserId);
        if (group is null) return NotFound("Group not found or access denied.");

        var messages = await _messageService.GetHistoryAsync(orgId, groupId, UserId, limit, before);
        return Ok(messages);
    }

    /// <summary>Add a member to the group.</summary>
    [HttpPost("{groupId}/members")]
    public async Task<IActionResult> AddMember(string orgId, string groupId, [FromBody] AddGroupMemberDto dto)
    {
        try
        {
            await _groupService.AddMemberAsync(groupId, orgId, UserId, dto.UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    /// <summary>Remove a member from the group.</summary>
    [HttpDelete("{groupId}/members/{targetUserId}")]
    public async Task<IActionResult> RemoveMember(string orgId, string groupId, string targetUserId)
    {
        try
        {
            await _groupService.RemoveMemberAsync(groupId, orgId, UserId, targetUserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }
}
