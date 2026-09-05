using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using PingMe.Core.Interfaces;

namespace PingMe.Api.Controllers;

[ApiController]
[Route("api/users")]
[Route("api/user")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IFileUploadService _fileUploadService;

    public UsersController(IUserService userService, IFileUploadService fileUploadService)
    {
        _userService = userService;
        _fileUploadService = fileUploadService;
    }

    [HttpGet("GetUserProfile/{id}")]
    [HttpGet("{id}")]
    [HttpGet("profile/{id}")]
    public async Task<IActionResult> GetUserProfile(string id)
    {
        var result = await _userService.GetUserProfileAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [Authorize]
    [HttpPost("keys")]
    public async Task<IActionResult> PublishKey(
        [FromBody] PublishKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdentityPublicKey))
            return BadRequest("Identity public key is required.");

        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        await _userService.PublishKeyAsync(
            userId,
            request.IdentityPublicKey);

        return NoContent();
    }

    [HttpGet("{userId}/keys")]
    [HttpGet("{userId}/public-key")]
    public async Task<IActionResult> GetPublicKey(string userId)
    {
        var identityPublicKey =
            await _userService.GetPublicKeyAsync(userId);

        if (string.IsNullOrWhiteSpace(identityPublicKey))
            return NotFound();

        return Ok(new
        {
            userId,
            identityPublicKey,
            publicKey = identityPublicKey
        });
    }

    [Authorize]
    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("No file provided");

        using var stream = file.OpenReadStream();
        var uploadResult = await _fileUploadService.UploadAsync(stream, file.FileName, file.ContentType);
        
        await _userService.UpdateAvatarUrlAsync(userId, uploadResult.Url);

        return Ok(new { avatarUrl = uploadResult.Url });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
        {
            await _userService.UpdateAvatarUrlAsync(userId, request.AvatarUrl.Trim());
        }

        return Ok(new { success = true, avatarUrl = request.AvatarUrl });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        var results = await _userService.SearchUsersAsync(q ?? "");
        return Ok(results);
    }
}

public class PublishKeyRequest
{
    public string IdentityPublicKey { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string? AvatarUrl { get; set; }
}