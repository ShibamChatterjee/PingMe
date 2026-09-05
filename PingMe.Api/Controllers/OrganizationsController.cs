using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PingMe.Api.Filters;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/organizations")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _orgService;

    public OrganizationsController(IOrganizationService orgService)
    {
        _orgService = orgService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrganizationDto dto)
    {
        var org = await _orgService.CreateAsync(UserId, dto);
        return Ok(org);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyOrganizations()
    {
        var orgs = await _orgService.GetMyOrganizationsAsync(UserId);
        return Ok(orgs);
    }

    [HttpGet("{orgId}")]
    [RequireOrgMembership]
    public async Task<IActionResult> GetById(string orgId)
    {
        var org = await _orgService.GetByIdAsync(orgId, UserId);
        if (org == null) return NotFound("Organization not found.");
        return Ok(org);
    }

    [HttpPut("{orgId}")]
    [RequireOrgMembership]
    public async Task<IActionResult> Update(string orgId, [FromBody] UpdateOrganizationDto dto)
    {
        try
        {
            var updated = await _orgService.UpdateAsync(orgId, UserId, dto);
            return Ok(updated);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("{orgId}")]
    [RequireOrgMembership]
    public async Task<IActionResult> Delete(string orgId)
    {
        try
        {
            await _orgService.DeleteAsync(orgId, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPost("{orgId}/transfer-ownership")]
    [RequireOrgMembership]
    public async Task<IActionResult> TransferOwnership(string orgId, [FromBody] TransferOwnershipDto dto)
    {
        try
        {
            await _orgService.TransferOwnershipAsync(orgId, UserId, dto.NewOwnerUserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPost("join/{joinCode}")]
    public async Task<IActionResult> JoinByCode(string joinCode)
    {
        try
        {
            var org = await _orgService.JoinByCodeAsync(joinCode, UserId);
            return Ok(org);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{orgId}/join-code")]
    [RequireOrgMembership]
    public async Task<IActionResult> GenerateJoinCode(string orgId)
    {
        try
        {
            var code = await _orgService.GenerateJoinCodeAsync(orgId, UserId);
            return Ok(new { joinCode = code });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpDelete("{orgId}/join-code")]
    [RequireOrgMembership]
    public async Task<IActionResult> DisableJoinCode(string orgId)
    {
        try
        {
            await _orgService.DisableJoinCodeAsync(orgId, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("{orgId}/invites")]
    [RequireOrgMembership]
    public async Task<IActionResult> Invite(string orgId, [FromBody] BatchInviteDto dto)
    {
        try
        {
            var created = await _orgService.BatchInviteAsync(orgId, UserId, dto);
            return Ok(created);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpGet("{orgId}/invites")]
    [RequireOrgMembership]
    public async Task<IActionResult> GetInvites(string orgId)
    {
        try
        {
            var list = await _orgService.GetInvitesAsync(orgId, UserId);
            return Ok(list);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("{orgId}/invites/{inviteId}/resend")]
    [RequireOrgMembership]
    public async Task<IActionResult> ResendInvite(string orgId, string inviteId)
    {
        try
        {
            await _orgService.ResendInviteAsync(orgId, UserId, inviteId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("{orgId}/invites/{inviteId}")]
    [RequireOrgMembership]
    public async Task<IActionResult> RevokeInvite(string orgId, string inviteId)
    {
        try
        {
            await _orgService.RevokeInviteAsync(orgId, UserId, inviteId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpGet("invites/{token}/preview")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInvitePreview(string token)
    {
        try
        {
            var preview = await _orgService.GetInvitePreviewAsync(token);
            return Ok(preview);
        }
        catch (InvalidOperationException ex) { return NotFound(ex.Message); }
    }

    [HttpPost("invites/{token}/accept")]
    public async Task<IActionResult> AcceptInvite(string token)
    {
        try
        {
            var org = await _orgService.AcceptInviteAsync(token, UserId);
            return Ok(org);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("invites/{token}/decline")]
    public async Task<IActionResult> DeclineInvite(string token)
    {
        try
        {
            await _orgService.DeclineInviteAsync(token, UserId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{orgId}/members")]
    [RequireOrgMembership]
    public async Task<IActionResult> GetMembers(string orgId)
    {
        var members = await _orgService.GetMembersAsync(orgId);
        return Ok(members);
    }

    [HttpPatch("{orgId}/members/{targetUserId}/role")]
    [RequireOrgMembership]
    public async Task<IActionResult> UpdateMemberRole(string orgId, string targetUserId, [FromBody] OrgRoleUpdateDto dto)
    {
        try
        {
            await _orgService.UpdateMemberRoleAsync(orgId, UserId, targetUserId, dto.Role);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{orgId}/members/{targetUserId}/suspend")]
    [RequireOrgMembership]
    public async Task<IActionResult> ToggleSuspendMember(string orgId, string targetUserId)
    {
        try
        {
            await _orgService.ToggleMemberSuspensionAsync(orgId, UserId, targetUserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("{orgId}/members/{targetUserId}")]
    [RequireOrgMembership]
    public async Task<IActionResult> RemoveMember(string orgId, string targetUserId)
    {
        try
        {
            await _orgService.RemoveMemberAsync(orgId, UserId, targetUserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpGet("{orgId}/files")]
    [RequireOrgMembership]
    public async Task<IActionResult> GetWorkspaceFiles(
        string orgId,
        [FromQuery] string? userId = null,
        [FromQuery] string? type = null)
    {
        try
        {
            var files = await _orgService.GetWorkspaceFilesAsync(orgId, UserId, userId, type);
            return Ok(files);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    // ── Ticket System Settings ────────────────────────────────────────────────

    [HttpGet("{orgId}/ticket-settings")]
    [RequireOrgMembership]
    public async Task<IActionResult> GetTicketSettings(string orgId, [FromServices] ITicketService ticketService)
    {
        var enabled = await ticketService.GetTicketSystemEnabledAsync(orgId);
        return Ok(new { enabled });
    }

    [HttpPatch("{orgId}/ticket-settings")]
    [RequireOrgMembership]
    public async Task<IActionResult> PatchTicketSettings(
        string orgId,
        [FromBody] TicketSettingsDto dto,
        [FromServices] ITicketService ticketService)
    {
        try
        {
            await ticketService.SetTicketSystemEnabledAsync(orgId, UserId, dto.Enabled);
            return Ok(new { enabled = dto.Enabled });
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
