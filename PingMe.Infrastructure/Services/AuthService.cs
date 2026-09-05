using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PingMe.Core.DTOs;
using PingMe.Core.Interfaces;
using PingMe.Core.Models;

namespace PingMe.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _config;
    
    public AuthService(IUserRepository userRepo, IConfiguration config)
    {
        _userRepo = userRepo;
        _config = config;
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        if (await _userRepo.EmailExistsAsync(dto.Email))
            return null;

        var user = new User
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            AuthProvider = "local",
            CreatedAt = DateTime.UtcNow
        };

        await _userRepo.CreateAsync(user);
        return new AuthResponseDto
        {
            AccessToken = GenerateToken(user),
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            IsNewUser = true,
            AuthProvider = "local"
        };
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _userRepo.GetByEmailAsync(dto.Email);
        if (user == null) return null;

        // If the user registered via Google and has no password, reject password login
        if (string.IsNullOrEmpty(user.PasswordHash))
            return null;

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        return new AuthResponseDto
        {
            AccessToken = GenerateToken(user),
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            IsNewUser = false,
            AuthProvider = user.AuthProvider
        };
    }

    public async Task<AuthResponseDto?> GoogleLoginAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(idToken))
            return null;

        idToken = idToken.Trim();
        GoogleJsonWebSignature.Payload payload;
        var clientId = _config["Google:ClientId"]?.Trim();

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings();
            if (!string.IsNullOrEmpty(clientId))
            {
                settings.Audience = new[] { clientId };
            }
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Google Auth Validation with settings failed]: {ex.Message}");
            try
            {
                // Fallback: validate token signature, then verify audience
                payload = await GoogleJsonWebSignature.ValidateAsync(idToken);
                if (!string.IsNullOrEmpty(clientId))
                {
                    bool audMatch = (payload.Audience != null && payload.Audience.ToString() == clientId)
                        || (payload.AudienceAsList != null && payload.AudienceAsList.Contains(clientId));
                    if (!audMatch)
                    {
                        Console.WriteLine($"[Google Auth Audience Mismatch]: Token Aud: {payload.Audience}, Configured: {clientId}");
                        return null;
                    }
                }
            }
            catch (Exception fallbackEx)
            {
                Console.WriteLine($"[Google Auth Fallback Validation failed]: {fallbackEx.Message}");
                return null;
            }
        }

        var googleId = payload.Subject;
        var email = payload.Email;
        var name = payload.Name ?? payload.Email.Split('@')[0];
        var avatarUrl = payload.Picture;

        // 1. Check if user exists by Google ID
        var user = await _userRepo.GetByGoogleIdAsync(googleId);

        if (user != null)
        {
            // Returning Google user
            // Update avatar if changed
            if (!string.IsNullOrEmpty(avatarUrl) && user.AvatarUrl != avatarUrl)
                await _userRepo.UpdateFieldAsync(user.Id, u => u.AvatarUrl, avatarUrl);

            return new AuthResponseDto
            {
                AccessToken = GenerateToken(user),
                UserId = user.Id,
                Username = user.Username,
                Email = user.Email,
                IsNewUser = false,
                AuthProvider = "google"
            };
        }

        // 2. Check if user exists by email (account linking)
        user = await _userRepo.GetByEmailAsync(email);

        if (user != null)
        {
            // Link the Google account to the existing local user
            await _userRepo.UpdateFieldAsync(user.Id, u => u.GoogleId, googleId);
            await _userRepo.UpdateFieldAsync(user.Id, u => u.AuthProvider,
                user.AuthProvider == "local" ? "local" : "google");
            
            if (!string.IsNullOrEmpty(avatarUrl) && string.IsNullOrEmpty(user.AvatarUrl))
                await _userRepo.UpdateFieldAsync(user.Id, u => u.AvatarUrl, avatarUrl);

            return new AuthResponseDto
            {
                AccessToken = GenerateToken(user),
                UserId = user.Id,
                Username = user.Username,
                Email = user.Email,
                IsNewUser = false, // Existing user, just linked
                AuthProvider = user.AuthProvider
            };
        }

        // 3. Brand new Google user — create account
        var newUser = new User
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            Username = name,
            Email = email,
            PasswordHash = null, // Google users have no password
            AuthProvider = "google",
            GoogleId = googleId,
            AvatarUrl = avatarUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepo.CreateAsync(newUser);

        return new AuthResponseDto
        {
            AccessToken = GenerateToken(newUser),
            UserId = newUser.Id,
            Username = newUser.Username,
            Email = newUser.Email,
            IsNewUser = true,
            AuthProvider = "google"
        };
    }

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.Username)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                double.Parse(_config["Jwt:ExpiryMinutes"]!)),
            signingCredentials: new SigningCredentials(
                key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}