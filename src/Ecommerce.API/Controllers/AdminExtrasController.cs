using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Linq;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
[Route("admin")]
public class AdminExtrasController : ControllerBase
{
    private static readonly List<WebhookDto> _webhooks = new();
    private static readonly List<LogDto> _logs = new();
    private static readonly List<NotificationDto> _notifications = new();
    private static readonly List<IntegrationDto> _integrations = new();
    private static readonly List<AdminUserDto> _admins = new();
    private static readonly List<CouponDto> _coupons = new();
    private static readonly List<BannerDto> _banners = new();
    private static readonly List<ReportDto> _reports = new();

    private static SettingsDto _settings = new()
    {
        StoreName = "Loja Demo",
        ContactEmail = "contato@ecommerce.com",
        Maintenance = false,
        DefaultDarkMode = true
    };

    private static ProfileDto _profile = new()
    {
        Name = "Admin User",
        Email = "admin@example.com",
        Avatar = "/default-avatar.png",
        Preferences = new Dictionary<string, object> { { "darkMode", true }, { "notifications", true } }
    };

    #region Webhooks

    [HttpGet("webhooks")]
    public IActionResult GetWebhooks() => Ok(_webhooks);

    [HttpPost("webhooks")]
    public IActionResult CreateWebhook([FromBody] WebhookDto dto)
    {
        var created = dto with { Id = Guid.NewGuid().ToString() };
        _webhooks.Add(created);
        return Ok(created);
    }

    #endregion

    #region Logs

    [HttpGet("logs")]
    public IActionResult GetLogs() => Ok(_logs);

    #endregion

    #region Notifications

    [HttpGet("notifications")]
    public IActionResult GetNotifications() => Ok(_notifications);

    [HttpPost("notifications/{id}/read")]
    public IActionResult MarkNotificationRead(string id)
    {
        var index = _notifications.FindIndex(n => n.Id == id);
        if (index >= 0)
        {
            var updated = _notifications[index] with { Read = true };
            _notifications[index] = updated;
        }
        return Ok(new { success = true });
    }

    [HttpGet("notifications/ws")]
    public async Task GetNotificationsWs()
    {
        if (!HttpContext.WebSockets.IsWebSocketRequest)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var socket = await HttpContext.WebSockets.AcceptWebSocketAsync();
        var payload = JsonSerializer.Serialize(_notifications);
        var buffer = Encoding.UTF8.GetBytes(payload);
        await socket.SendAsync(buffer, WebSocketMessageType.Text, true, HttpContext.RequestAborted);
        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Done", HttpContext.RequestAborted);
    }

    #endregion

    #region Reports

    [HttpGet("reports")]
    public IActionResult GetReports() => Ok(_reports);

    #endregion

    #region Settings

    [HttpGet("settings")]
    public IActionResult GetSettings() => Ok(_settings);

    [HttpPut("settings")]
    public IActionResult UpdateSettings([FromBody] SettingsDto dto)
    {
        _settings = dto;
        return Ok(_settings);
    }

    #endregion

    #region Profile

    [HttpGet("profile")]
    public IActionResult GetProfile() => Ok(_profile);

    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] ProfileDto dto)
    {
        _profile = dto;
        return Ok(_profile);
    }

    [HttpPost("profile/avatar")]
    public IActionResult UploadAvatar()
    {
        _profile = _profile with { Avatar = "/default-avatar.png" };
        return Ok(new { url = _profile.Avatar });
    }

    #endregion

    #region Integrations

    [HttpGet("integrations")]
    public IActionResult GetIntegrations() => Ok(_integrations);

    [HttpPost("integrations")]
    public IActionResult CreateIntegration([FromBody] IntegrationDto dto)
    {
        var created = dto with { Id = Guid.NewGuid().ToString() };
        _integrations.Add(created);
        return Ok(created);
    }

    [HttpPut("integrations/{id}")]
    public IActionResult UpdateIntegration(string id, [FromBody] IntegrationDto dto)
    {
        var index = _integrations.FindIndex(i => i.Id == id);
        if (index >= 0)
        {
            _integrations[index] = dto with { Id = id };
        }
        return Ok(dto with { Id = id });
    }

    [HttpDelete("integrations/{id}")]
    public IActionResult DeleteIntegration(string id)
    {
        _integrations.RemoveAll(i => i.Id == id);
        return Ok(new { success = true });
    }

    [HttpPost("integrations/{id}/test")]
    public IActionResult TestIntegration(string id) => Ok(new { success = true, id });

    [HttpGet("integrations/{id}/logs")]
    public IActionResult GetIntegrationLogs(string id) => Ok(Array.Empty<object>());

    #endregion

    #region Admins

    [HttpGet("admins")]
    public IActionResult GetAdmins() => Ok(_admins);

    [HttpPost("admins/invite")]
    public IActionResult InviteAdmin([FromBody] AdminInviteDto dto)
    {
        var created = new AdminUserDto(Guid.NewGuid().ToString(), dto.Email, dto.Role, false);
        _admins.Add(created);
        return Ok(created);
    }

    [HttpPost("admins/invite-batch")]
    public IActionResult InviteAdmins([FromBody] AdminInviteBatchDto dto)
    {
        foreach (var email in dto.Emails)
        {
            _admins.Add(new AdminUserDto(Guid.NewGuid().ToString(), email, dto.Role, false));
        }
        return Ok(new { success = true });
    }

    [HttpGet("admins/{id}/logs")]
    public IActionResult GetAdminLogs(string id) => Ok(Array.Empty<object>());

    [HttpPost("admins/{id}/{action}")]
    public IActionResult ToggleAdmin(string id, string action) => Ok(new { success = true });

    [HttpPatch("admins/{id}/role")]
    public IActionResult UpdateAdminRole(string id, [FromBody] AdminRoleDto dto) => Ok(new { id, role = dto.Role });

    #endregion

    #region Coupons

    [HttpGet("promotions/coupons")]
    public IActionResult GetCoupons() => Ok(_coupons);

    [HttpPost("promotions/coupons")]
    public IActionResult CreateCoupon([FromBody] CouponDto dto)
    {
        var created = dto with { Id = Guid.NewGuid().ToString() };
        _coupons.Add(created);
        return Ok(created);
    }

    [HttpGet("promotions/coupons/{id}")]
    public IActionResult GetCoupon(string id)
    {
        var coupon = _coupons.FirstOrDefault(c => c.Id == id);
        return coupon == null ? NotFound() : Ok(coupon);
    }

    [HttpPut("promotions/coupons/{id}")]
    public IActionResult UpdateCoupon(string id, [FromBody] CouponDto dto)
    {
        var index = _coupons.FindIndex(c => c.Id == id);
        if (index >= 0)
        {
            _coupons[index] = dto with { Id = id };
        }
        return Ok(dto with { Id = id });
    }

    #endregion

    #region Banners

    [HttpGet("banners")]
    public IActionResult GetBanners() => Ok(_banners);

    [HttpPost("banners")]
    public IActionResult CreateBanner([FromBody] BannerDto dto)
    {
        var created = dto with { Id = Guid.NewGuid().ToString() };
        _banners.Add(created);
        return Ok(created);
    }

    [HttpPut("banners/{id}")]
    public IActionResult UpdateBanner(string id, [FromBody] BannerDto dto)
    {
        var index = _banners.FindIndex(b => b.Id == id);
        if (index >= 0)
        {
            _banners[index] = dto with { Id = id };
        }
        return Ok(dto with { Id = id });
    }

    [HttpDelete("banners/{id}")]
    public IActionResult DeleteBanner(string id)
    {
        _banners.RemoveAll(b => b.Id == id);
        return Ok(new { success = true });
    }

    [HttpPost("banners/{id}/move")]
    public IActionResult MoveBanner(string id, [FromBody] BannerMoveDto dto) => Ok(new { id, dto.Direction });

    [HttpPatch("banners/{id}/move")]
    public IActionResult MoveBannerPatch(string id, [FromBody] BannerMoveDto dto) => Ok(new { id, dto.Direction });

    #endregion
}

public record WebhookDto(string Id, string Event, string Url, bool Enabled);
public record LogDto(string Id, DateTime Date, string Action, string Details, string? UserName, string? UserEmail);
public record NotificationDto(string Id, string Title, string Message, DateTime Date, bool Read);
public record IntegrationDto(string Id, string Name, string Provider, string Status, string ApiKey, string Type);
public record AdminUserDto(string Id, string Email, string Role, bool Blocked);
public record AdminInviteDto(string Email, string Role);
public record AdminInviteBatchDto(string[] Emails, string Role);
public record AdminRoleDto(string Role);
public record CouponDto(string Id, string Code, decimal Discount, bool Active);
public record BannerDto(string Id, string Title, string Image, string Link, bool Active, string StartDate, string EndDate);
public record BannerMoveDto(string Direction);
public record ReportDto(string Name, string Type, DateTime Date, decimal? Value);
public record SettingsDto
{
    public string StoreName { get; init; } = string.Empty;
    public string ContactEmail { get; init; } = string.Empty;
    public bool Maintenance { get; init; }
    public bool DefaultDarkMode { get; init; }
}
public record ProfileDto
{
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Avatar { get; init; } = string.Empty;
    public Dictionary<string, object> Preferences { get; init; } = new();
}