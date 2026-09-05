namespace PingMe.Core.DTOs;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string Email { get; set; } = default!;
    public bool IsNewUser { get; set; }
    public string AuthProvider { get; set; } = "local";
}

public class UserProfileResponseDto
{
    public string Id { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}