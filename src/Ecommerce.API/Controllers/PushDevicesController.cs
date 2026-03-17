using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Ecommerce.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/push/devices")]
public class PushDevicesController : ControllerBase
{
    private readonly PushDeviceService _service;
    private readonly PushNotificationService _pushNotificationService;

    public PushDevicesController(PushDeviceService service, PushNotificationService pushNotificationService)
    {
        _service = service;
        _pushNotificationService = pushNotificationService;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Register([FromBody] RegisterPushDeviceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Platform))
            return BadRequest(new { message = "Token and platform are required" });

        if (!PushNotificationService.IsSupportedPlatform(request.Platform))
            return BadRequest(new { message = "Platform must be one of: ios, android, expo, web" });

        var userId = GetUserId();
        var device = await _service.RegisterAsync(userId, request.Token, request.Platform, request.DeviceName);
        return Ok(device);
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> List()
    {
        var userId = GetUserId();
        var devices = await _service.GetByUserAsync(userId);
        return Ok(devices);
    }

    [HttpDelete]
    [Authorize]
    public async Task<IActionResult> Remove([FromBody] RemovePushDeviceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Token is required" });

        var userId = GetUserId();
        await _service.RemoveAsync(userId, request.Token);
        return NoContent();
    }

    [HttpPost("test")]
    [Authorize]
    public async Task<IActionResult> SendTest([FromBody] SendTestPushRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { message = "Title and body are required" });

        try
        {
            var userId = GetUserId();
            var payload = new PushNotificationService.PushMessage(
                request.Title.Trim(),
                request.Body.Trim(),
                string.IsNullOrWhiteSpace(request.DeepLink) ? null : request.DeepLink.Trim(),
                request.Data ?? new Dictionary<string, string>());

            var result = await _pushNotificationService.SendToUserAsync(userId, payload, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
            throw new UnauthorizedAccessException("Invalid user context");
        return userId;
    }

    public record RegisterPushDeviceRequest(string Token, string Platform, string? DeviceName);
    public record RemovePushDeviceRequest(string Token);
    public record SendTestPushRequest(string Title, string Body, string? DeepLink, Dictionary<string, string>? Data);
}
