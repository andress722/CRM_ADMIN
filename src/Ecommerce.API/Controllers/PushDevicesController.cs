using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/push/devices")]
public class PushDevicesController : ControllerBase
{
    private readonly PushDeviceService _service;

    public PushDevicesController(PushDeviceService service)
        => _service = service;

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Register([FromBody] RegisterPushDeviceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Platform))
            return BadRequest(new { message = "Token and platform are required" });

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

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
            throw new UnauthorizedAccessException("Invalid user context");
        return userId;
    }

    public record RegisterPushDeviceRequest(string Token, string Platform, string? DeviceName);
    public record RemovePushDeviceRequest(string Token);
}
