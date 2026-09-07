using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PingMe.Api.Controllers;

/// <summary>
/// Provides WebRTC TURN server credentials to authenticated clients.
/// When metered.ca is configured, proxies the request to get fresh credentials.
/// Otherwise returns a STUN-only fallback (which won't work across different networks).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TurnController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;

    public TurnController(IConfiguration config, IHttpClientFactory httpFactory)
    {
        _config = config;
        _httpFactory = httpFactory;
    }

    /// <summary>
    /// Returns an array of ICE server configurations for WebRTC.
    /// If metered.ca is configured, fetches fresh TURN credentials from their API.
    /// </summary>
    [HttpGet("credentials")]
    public async Task<IActionResult> GetCredentials()
    {
        var appName = _config["Turn:MeteredAppName"];
        var apiKey = _config["Turn:MeteredApiKey"];

        if (!string.IsNullOrWhiteSpace(appName) && !string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var client = _httpFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var url = $"https://{appName}.metered.live/api/v1/turn/credentials?apiKey={apiKey}";
                var response = await client.GetStringAsync(url);
                return Content(response, "application/json");
            }
            catch (Exception ex)
            {
                // Fall through to fallback STUN-only config
                Console.WriteLine($"[TurnController] Failed to fetch metered.ca credentials: {ex.Message}");
            }
        }

        // Fallback: STUN-only (won't relay across different networks)
        var fallback = new[]
        {
            new { urls = "stun:stun.l.google.com:19302" },
            new { urls = "stun:stun1.l.google.com:19302" },
        };
        return Ok(fallback);
    }
}
