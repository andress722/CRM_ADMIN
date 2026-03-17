using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using AspNetCoreRateLimit;
using Microsoft.Extensions.Options;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
[Route("admin")]
public class AdminExtrasController : ControllerBase
{
    private readonly IWebhookRepository _webhooks;
    private readonly IEmailLogRepository _emailLogs;
    private readonly IUserRepository _users;
    private readonly ICouponRepository _couponRepository;
    private readonly IBannerRepository _bannerRepository;
    private readonly EcommerceDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AdminExtrasController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IpRateLimitOptions _rateLimitOptions;

    public AdminExtrasController(
        IWebhookRepository webhooks,
        IEmailLogRepository emailLogs,
        IUserRepository users,
        ICouponRepository couponRepository,
        IBannerRepository bannerRepository,
        EcommerceDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IOptions<IpRateLimitOptions> rateLimitOptions,
        ILogger<AdminExtrasController> logger)
    {
        _webhooks = webhooks;
        _emailLogs = emailLogs;
        _users = users;
        _couponRepository = couponRepository;
        _bannerRepository = bannerRepository;
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _rateLimitOptions = rateLimitOptions.Value;
        _logger = logger;
    }


    #region Webhooks
    [HttpGet("webhooks")]
    public async Task<IActionResult> GetWebhooks()
    {
        var list = (await _webhooks.GetAllAsync())
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new WebhookDto(
                x.Id.ToString(),
                x.EventTypes.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "*",
                x.Url,
                x.IsActive))
            .ToList();

        return Ok(list);
    }

    [HttpPost("webhooks")]
    public async Task<IActionResult> CreateWebhook([FromBody] WebhookDto dto)
    {
        var entity = new Webhook
        {
            Id = Guid.NewGuid(),
            Url = dto.Url,
            EventTypes = string.IsNullOrWhiteSpace(dto.Event) ? "*" : dto.Event,
            Secret = Guid.NewGuid().ToString("N"),
            IsActive = dto.Enabled,
            CreatedAt = DateTime.UtcNow
        };

        await _webhooks.AddAsync(entity);

        return Ok(new WebhookDto(entity.Id.ToString(), dto.Event, entity.Url, entity.IsActive));
    }

    #endregion

    #region Logs

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs()
    {
        var auditLogs = await _db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new LogDto(
                x.Id.ToString(),
                x.CreatedAt,
                x.Action,
                x.MetadataJson,
                x.ActorEmail,
                x.ActorEmail))
            .ToListAsync();

        var emailLogs = (await _emailLogs.GetRecentAsync(50))
            .Select(x => new LogDto(
                x.Id.ToString(),
                x.CreatedAt,
                "Email",
                $"To={x.To}; Subject={x.Subject}; Status={x.Status}{(string.IsNullOrWhiteSpace(x.Error) ? string.Empty : $"; Error={x.Error}")}",
                null,
                x.To));

        var merged = auditLogs
            .Concat(emailLogs)
            .OrderByDescending(x => x.Date)
            .Take(250)
            .ToList();

        return Ok(merged);
    }

    #endregion

    #region Notifications

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        var notifications = await BuildNotificationsAsync();
        return Ok(notifications);
    }

    [HttpPost("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { message = "notification id is required" });
        }

        var actorEmail = User?.Identity?.Name ?? User?.Claims.FirstOrDefault(c => c.Type == "email")?.Value ?? "admin@system.local";
        var actorUserId = Guid.TryParse(User?.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value, out var parsedUserId)
            ? parsedUserId
            : (Guid?)null;

        var alreadyRead = await _db.AuditLogs
            .AsNoTracking()
            .AnyAsync(x => x.EntityType == "Notification" && x.EntityId == id && x.Action == "Read");

        if (!alreadyRead)
        {
            await _db.AuditLogs.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = actorUserId,
                ActorEmail = actorEmail,
                Action = "Read",
                EntityType = "Notification",
                EntityId = id,
                MetadataJson = "{}",
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
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
        var notifications = await BuildNotificationsAsync();
        var payload = JsonSerializer.Serialize(notifications);
        var buffer = Encoding.UTF8.GetBytes(payload);
        await socket.SendAsync(buffer, WebSocketMessageType.Text, true, HttpContext.RequestAborted);
        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Done", HttpContext.RequestAborted);
    }

    private async Task<List<NotificationDto>> BuildNotificationsAsync()
    {
        var readIds = await GetReadNotificationIdsAsync();

        var failedDeliveries = await _db.WebhookDeliveries
            .AsNoTracking()
            .Where(x => x.Status == "Failed")
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync();

        var failedEmails = (await _emailLogs.GetRecentAsync(50))
            .Where(x => !x.Status.Equals("Sent", StringComparison.OrdinalIgnoreCase))
            .Take(20)
            .ToList();

        var notifications = new List<NotificationDto>();

        notifications.AddRange(failedDeliveries.Select(x =>
            new NotificationDto(
                $"wh-{x.Id}",
                "Falha em webhook",
                $"Evento {x.EventType} falhou na tentativa {x.Attempt}.",
                x.CreatedAt,
                readIds.Contains($"wh-{x.Id}"))));

        notifications.AddRange(failedEmails.Select(x =>
            new NotificationDto(
                $"email-{x.Id}",
                "Falha em e-mail",
                $"Envio para {x.To} com status {x.Status}.",
                x.CreatedAt,
                readIds.Contains($"email-{x.Id}"))));

        return notifications
            .OrderByDescending(x => x.Date)
            .Take(50)
            .ToList();
    }

    private async Task<HashSet<string>> GetReadNotificationIdsAsync()
    {
        var ids = await _db.AuditLogs
            .AsNoTracking()
            .Where(x => x.EntityType == "Notification" && x.Action == "Read")
            .OrderByDescending(x => x.CreatedAt)
            .Take(2000)
            .Select(x => x.EntityId!)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToListAsync();

        return ids.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
    #endregion

    #region Reports

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports()
    {
        var reports = await _db.DailyKpis
            .AsNoTracking()
            .OrderByDescending(x => x.Date)
            .Take(30)
            .Select(x => new ReportDto($"KPIs {x.Date:yyyy-MM-dd}", "daily_kpi", x.Date.ToDateTime(TimeOnly.MinValue), x.Purchases))
            .ToListAsync();

        return Ok(reports);
    }

    #endregion

    #region Settings

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await GetOrCreateSettingsAsync();
        return Ok(new SettingsDto
        {
            StoreName = settings.StoreName,
            ContactEmail = settings.ContactEmail,
            Maintenance = settings.Maintenance,
            DefaultDarkMode = settings.DefaultDarkMode
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsDto dto)
    {
        var settings = await GetOrCreateSettingsAsync();
        settings.StoreName = dto.StoreName;
        settings.ContactEmail = dto.ContactEmail;
        settings.Maintenance = dto.Maintenance;
        settings.DefaultDarkMode = dto.DefaultDarkMode;
        settings.UpdatedAt = DateTime.UtcNow;

        _db.AdminSettings.Update(settings);
        await _db.SaveChangesAsync();

        return Ok(dto);
    }

    [HttpGet("email-template")]
    public async Task<IActionResult> GetEmailTemplate()
    {
        var settings = await GetOrCreateSettingsAsync();
        return Ok(new EmailTemplateDto
        {
            Template = settings.EmailTemplate
        });
    }

    [HttpPut("email-template")]
    public async Task<IActionResult> UpdateEmailTemplate([FromBody] EmailTemplateDto dto)
    {
        var settings = await GetOrCreateSettingsAsync();
        settings.EmailTemplate = dto.Template ?? string.Empty;
        settings.UpdatedAt = DateTime.UtcNow;

        _db.AdminSettings.Update(settings);
        await _db.SaveChangesAsync();
        return Ok(new EmailTemplateDto
        {
            Template = settings.EmailTemplate
        });
    }

    [HttpGet("debug/checkout-health")]
    public async Task<IActionResult> GetCheckoutHealth()
    {
        var correlationId = HttpContext.Response.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? HttpContext.TraceIdentifier;

        var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Production";

        var provider = _configuration["Payments:Provider"] ?? string.Empty;
        var allowStubOutsideDevelopment = _configuration.GetValue("Payments:AllowStubOutsideDevelopment", false);
        var mercadoPagoToken = _configuration["Payments:MercadoPago:AccessToken"];
        var mercadoPagoWebhookUrl = _configuration["Payments:MercadoPago:WebhookUrl"];

        var captchaEnabled = _configuration.GetValue("Security:Captcha:Enabled", false);
        var captchaSecretConfigured = !string.IsNullOrWhiteSpace(_configuration["Security:Captcha:SecretKey"]);

        var currentUserId = GetCurrentUserId();
        var authenticated = currentUserId != Guid.Empty;
        var userExists = false;
        if (authenticated)
        {
            var user = await _users.GetByIdAsync(currentUserId);
            userExists = user != null;
        }

        var antiAbuseRouteClasses = BuildAntiAbuseRouteClasses();
        var antiAbuseAlerts = LoadAlertNames();
        var warnings = new List<string>();

        if (string.IsNullOrWhiteSpace(provider))
        {
            warnings.Add("Payments:Provider is not configured.");
        }

        if (provider.Equals("MercadoPago", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(mercadoPagoToken))
        {
            warnings.Add("MercadoPago provider is selected but access token is missing.");
        }

        if (provider.Equals("Stub", StringComparison.OrdinalIgnoreCase)
            && !environmentName.Equals("Development", StringComparison.OrdinalIgnoreCase)
            && !allowStubOutsideDevelopment)
        {
            warnings.Add("Stub payments are blocked outside Development unless Payments:AllowStubOutsideDevelopment=true.");
        }

        if (captchaEnabled && !captchaSecretConfigured)
        {
            warnings.Add("Captcha is enabled but Security:Captcha:SecretKey is missing.");
        }

        if (!authenticated)
        {
            warnings.Add("No authenticated user context found in token.");
        }
        else if (!userExists)
        {
            warnings.Add("Authenticated token user was not found in database.");
        }

        foreach (var routeClass in antiAbuseRouteClasses.Where(x => x.ExpectedAlertCoverage && x.CoupledAlerts.Count == 0))
        {
            warnings.Add($"Route class '{routeClass.Key}' has rate-limit rules but no coupled alert coverage.");
        }

        return Ok(new
        {
            correlationId,
            environment = environmentName,
            auth = new
            {
                authenticated,
                userId = authenticated ? currentUserId.ToString() : null,
                userExists
            },
            checkout = new
            {
                paymentProvider = string.IsNullOrWhiteSpace(provider) ? "(unset)" : provider,
                allowStubOutsideDevelopment,
                mercadoPagoTokenConfigured = !string.IsNullOrWhiteSpace(mercadoPagoToken),
                mercadoPagoTokenPreview = MaskSecret(mercadoPagoToken),
                mercadoPagoWebhookUrlConfigured = !string.IsNullOrWhiteSpace(mercadoPagoWebhookUrl)
            },
            captcha = new
            {
                enabled = captchaEnabled,
                secretConfigured = captchaSecretConfigured
            },
            antiAbuse = new
            {
                routeClasses = antiAbuseRouteClasses,
                alerts = antiAbuseAlerts,
                rateLimitRulesVersioned = _rateLimitOptions.GeneralRules?.Any() == true
            },
            warnings,
            healthy = warnings.Count == 0
        });
    }

    private Guid GetCurrentUserId()
    {
        var sub = User?.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
            ?? User?.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User?.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

        return Guid.TryParse(sub, out var userId) ? userId : Guid.Empty;
    }

    private static string MaskSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "(not configured)";
        }

        var trimmed = value.Trim();
        if (trimmed.Length <= 4)
        {
            return "****";
        }

        return $"****{trimmed[^4..]}";
    }
    private List<AntiAbuseRouteClassDto> BuildAntiAbuseRouteClasses()
    {
        var rules = _rateLimitOptions.GeneralRules ?? new List<RateLimitRule>();
        var alertNames = LoadAlertNames();

        return rules
            .GroupBy(rule => ClassifyRouteClass(rule.Endpoint))
            .Select(group =>
            {
                var endpoints = group
                    .Select(rule => rule.Endpoint)
                    .Where(endpoint => !string.IsNullOrWhiteSpace(endpoint))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(4)
                    .ToList();

                var coupledAlerts = ResolveCoupledAlerts(group.Key, alertNames);
                var limits = group.Select(rule => (int)rule.Limit).ToList();

                return new AntiAbuseRouteClassDto(
                    group.Key,
                    LabelForRouteClass(group.Key),
                    group.Count(),
                    limits.Count == 0 ? 0 : limits.Min(),
                    limits.Count == 0 ? 0 : limits.Max(),
                    endpoints,
                    coupledAlerts,
                    ExpectedAlertCoverageForRouteClass(group.Key));
            })
            .OrderBy(x => x.Key)
            .ToList();
    }

    private List<string> LoadAlertNames()
    {
        var path = FindUpwards("docs", "observability", "alert-rules.prometheus.yml");
        if (path == null || !System.IO.File.Exists(path))
        {
            return new List<string>();
        }

        return System.IO.File.ReadAllLines(path)
            .Select(line => line.Trim())
            .Where(line => line.StartsWith("- alert:", StringComparison.Ordinal))
            .Select(line => line[8..].Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToList();
    }
    private static string? FindUpwards(params string[] relativeParts)
    {
        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (current != null)
        {
            var candidate = Path.Combine(new[] { current.FullName }.Concat(relativeParts).ToArray());
            if (System.IO.File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        return null;
    }

    private static string ClassifyRouteClass(string? endpoint)
    {
        var value = endpoint?.Trim().ToLowerInvariant() ?? string.Empty;
        if (value.Contains("/api/v1/auth/")) return "auth";
        if (value.Contains("/api/webhooks/") || value.Contains("/subscriptions/webhooks/")) return "webhook";
        if (value.Contains("/api/v1/payments/") || value.Contains("/api/v1/orders/from-cart") || value.Contains("/api/v1/subscriptions/")) return "checkout";
        if (value.Contains("/api/v1/admin/") || value.Contains("/api/v1/lgpd/")) return "admin_sensitive";
        return "default";
    }

    private static string LabelForRouteClass(string key)
        => key switch
        {
            "auth" => "Auth",
            "checkout" => "Checkout/Payments",
            "webhook" => "Webhooks",
            "admin_sensitive" => "Admin Sensitive",
            _ => "Default"
        };

    private static bool ExpectedAlertCoverageForRouteClass(string key)
        => key is "auth" or "checkout" or "webhook";

    private static List<string> ResolveCoupledAlerts(string routeClass, IReadOnlyCollection<string> alertNames)
    {
        var expected = routeClass switch
        {
            "auth" => new[] { "EcommerceApiAuth429Spike" },
            "checkout" => new[] { "EcommerceApiCheckout429Spike", "EcommerceApiHighP95Latency" },
            "webhook" => new[] { "EcommerceApiWebhook429Spike", "MercadoPagoWebhook5xxSpike" },
            _ => Array.Empty<string>()
        };

        return expected
            .Where(alert => alertNames.Contains(alert, StringComparer.OrdinalIgnoreCase))
            .ToList();
    }
    private async Task<AdminSetting> GetOrCreateSettingsAsync()
    {
        var settings = await _db.AdminSettings.AsNoTracking().OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync();
        if (settings != null)
        {
            settings.EmailTemplate ??= GetDefaultEmailTemplate();
            return settings;
        }

        var created = new AdminSetting
        {
            Id = Guid.NewGuid(),
            StoreName = "Loja Demo",
            ContactEmail = "contato@ecommerce.com",
            EmailTemplate = GetDefaultEmailTemplate(),
            Maintenance = false,
            DefaultDarkMode = true,
            UpdatedAt = DateTime.UtcNow
        };

        await _db.AdminSettings.AddAsync(created);
        await _db.SaveChangesAsync();
        return created;
    }

    private static string GetDefaultEmailTemplate()
        => "Assunto: Resumo da sua compra\n\nOla, {{nome}}!\nSeu pedido {{pedido}} foi atualizado.";

    #endregion

    #region Profile

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await GetOrCreateProfileAsync();
        var preferences = ParsePreferences(profile.PreferencesJson);

        return Ok(new ProfileDto
        {
            Name = profile.Name,
            Email = profile.Email,
            Avatar = profile.Avatar,
            Preferences = preferences
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileDto dto)
    {
        var profile = await GetOrCreateProfileAsync();
        profile.Name = dto.Name;
        profile.Email = dto.Email;
        profile.Avatar = dto.Avatar;
        profile.PreferencesJson = JsonSerializer.Serialize(dto.Preferences ?? new Dictionary<string, object>());
        profile.UpdatedAt = DateTime.UtcNow;

        _db.AdminProfiles.Update(profile);
        await _db.SaveChangesAsync();

        return Ok(dto);
    }

    [HttpPost("profile/avatar")]
    public async Task<IActionResult> UploadAvatar()
    {
        var profile = await GetOrCreateProfileAsync();
        profile.Avatar = "/default-avatar.png";
        profile.UpdatedAt = DateTime.UtcNow;
        _db.AdminProfiles.Update(profile);
        await _db.SaveChangesAsync();
        return Ok(new { url = profile.Avatar });
    }

    private async Task<AdminProfile> GetOrCreateProfileAsync()
    {
        var currentEmail = User?.Identity?.Name ?? User?.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
        AdminProfile? profile = null;

        if (!string.IsNullOrWhiteSpace(currentEmail))
        {
            profile = await _db.AdminProfiles.FirstOrDefaultAsync(x => x.Email == currentEmail);
        }

        profile ??= await _db.AdminProfiles.OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync();
        if (profile != null)
        {
            return profile;
        }

        var created = new AdminProfile
        {
            Id = Guid.NewGuid(),
            Name = "Admin User",
            Email = currentEmail ?? "admin@example.com",
            Avatar = "/default-avatar.png",
            PreferencesJson = JsonSerializer.Serialize(new Dictionary<string, object>
            {
                ["darkMode"] = true,
                ["notifications"] = true
            }),
            UpdatedAt = DateTime.UtcNow
        };

        await _db.AdminProfiles.AddAsync(created);
        await _db.SaveChangesAsync();
        return created;
    }

    private static Dictionary<string, object> ParsePreferences(string? preferencesJson)
    {
        if (string.IsNullOrWhiteSpace(preferencesJson))
        {
            return new Dictionary<string, object>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(preferencesJson);
            if (parsed == null)
            {
                return new Dictionary<string, object>();
            }

            return parsed.ToDictionary(k => k.Key, v => ConvertJsonElement(v.Value) ?? string.Empty);
        }
        catch
        {
            return new Dictionary<string, object>();
        }
    }

    private static object? ConvertJsonElement(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number when value.TryGetInt64(out var i) => i,
            JsonValueKind.Number when value.TryGetDecimal(out var d) => d,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Array => value.EnumerateArray().Select(ConvertJsonElement).ToList(),
            JsonValueKind.Object => value.EnumerateObject().ToDictionary(p => p.Name, p => ConvertJsonElement(p.Value)),
            _ => null
        };
    }

    #endregion

    #region Integrations

    [HttpGet("integrations")]
    public async Task<IActionResult> GetIntegrations()
    {
        var integrations = await _db.AdminIntegrations
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new IntegrationDto(
                x.Id.ToString(),
                x.Name,
                x.Provider,
                x.Status,
                x.ApiKey,
                x.Type))
            .ToListAsync();

        return Ok(integrations);
    }

    [HttpPost("integrations")]
    public async Task<IActionResult> CreateIntegration([FromBody] IntegrationDto dto)
    {
        var now = DateTime.UtcNow;
        var integration = new AdminIntegration
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Provider = dto.Provider,
            Status = dto.Status,
            ApiKey = dto.ApiKey,
            Type = dto.Type,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _db.AdminIntegrations.AddAsync(integration);
        await _db.SaveChangesAsync();

        return Ok(new IntegrationDto(
            integration.Id.ToString(),
            integration.Name,
            integration.Provider,
            integration.Status,
            integration.ApiKey,
            integration.Type));
    }

    [HttpPut("integrations/{id}")]
    public async Task<IActionResult> UpdateIntegration(string id, [FromBody] IntegrationDto dto)
    {
        if (!Guid.TryParse(id, out var integrationId))
        {
            return NotFound();
        }

        var integration = await _db.AdminIntegrations.FirstOrDefaultAsync(x => x.Id == integrationId);
        if (integration == null)
        {
            return NotFound();
        }

        integration.Name = dto.Name;
        integration.Provider = dto.Provider;
        integration.Status = dto.Status;
        integration.ApiKey = dto.ApiKey;
        integration.Type = dto.Type;
        integration.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new IntegrationDto(
            integration.Id.ToString(),
            integration.Name,
            integration.Provider,
            integration.Status,
            integration.ApiKey,
            integration.Type));
    }

    [HttpDelete("integrations/{id}")]
    public async Task<IActionResult> DeleteIntegration(string id)
    {
        if (!Guid.TryParse(id, out var integrationId))
        {
            return NotFound();
        }

        var integration = await _db.AdminIntegrations.FirstOrDefaultAsync(x => x.Id == integrationId);
        if (integration == null)
        {
            return NotFound();
        }

        _db.AdminIntegrations.Remove(integration);
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpPost("integrations/{id}/test")]
    public async Task<IActionResult> TestIntegration(string id)
    {
        if (!Guid.TryParse(id, out var integrationId))
        {
            return NotFound();
        }

        var integration = await _db.AdminIntegrations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == integrationId);
        if (integration == null)
        {
            return NotFound();
        }

        var provider = integration.Provider?.Trim().ToLowerInvariant() ?? string.Empty;
        var apiKey = integration.ApiKey?.Trim() ?? string.Empty;

        var (targetUrl, authToken) = ResolveIntegrationProbe(provider, apiKey);
        if (string.IsNullOrWhiteSpace(targetUrl))
        {
            return BadRequest(new
            {
                success = false,
                id,
                message = "Integration test requires a known provider or a valid URL in apiKey."
            });
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            using var request = new HttpRequestMessage(HttpMethod.Get, targetUrl);
            if (!string.IsNullOrWhiteSpace(authToken))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authToken);
            }

            var response = await client.SendAsync(request, HttpContext.RequestAborted);
            var body = await response.Content.ReadAsStringAsync(HttpContext.RequestAborted);
            var isSuccess = response.IsSuccessStatusCode;

            if (!isSuccess)
            {
                _logger.LogWarning("Integration test failed for {Provider} ({Id}) with status {StatusCode}", integration.Provider, integration.Id, (int)response.StatusCode);
            }

            return Ok(new
            {
                success = isSuccess,
                id,
                provider = integration.Provider,
                target = targetUrl,
                statusCode = (int)response.StatusCode,
                message = isSuccess ? "Connectivity test passed." : "Connectivity test failed.",
                response = string.IsNullOrWhiteSpace(body) ? null : body[..Math.Min(body.Length, 500)]
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Integration test exception for {Provider} ({Id})", integration.Provider, integration.Id);
            return Ok(new
            {
                success = false,
                id,
                provider = integration.Provider,
                message = ex.Message
            });
        }
    }

    [HttpGet("integrations/{id}/logs")]
    public async Task<IActionResult> GetIntegrationLogs(string id)
    {
        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Where(x => x.EntityType == "Integration" || x.EntityId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new
            {
                id = x.Id.ToString(),
                action = x.Action,
                details = x.MetadataJson,
                actor = x.ActorEmail,
                createdAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }


    private static (string? targetUrl, string? authToken) ResolveIntegrationProbe(string provider, string apiKey)
    {
        if (Uri.TryCreate(apiKey, UriKind.Absolute, out var explicitUri)
            && (explicitUri.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase)
                || explicitUri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)))
        {
            return (explicitUri.ToString(), null);
        }

        return provider switch
        {
            "sendgrid" => ("https://api.sendgrid.com/v3/user/account", string.IsNullOrWhiteSpace(apiKey) ? null : apiKey),
            "mercadopago" => ("https://api.mercadopago.com/users/me", string.IsNullOrWhiteSpace(apiKey) ? null : apiKey),
            "vercel" => ("https://api.vercel.com/v2/user", string.IsNullOrWhiteSpace(apiKey) ? null : apiKey),
            "slack" => ("https://slack.com/api/auth.test", string.IsNullOrWhiteSpace(apiKey) ? null : apiKey),
            _ => (null, null)
        };
    }

    #endregion

    #region Admins

    [HttpGet("admins")]
    public async Task<IActionResult> GetAdmins()
    {
        var realAdmins = (await _users.GetAllAsync())
            .Where(u => u.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            .Select(u => new AdminUserDto(u.Id.ToString(), u.Email, u.Role, u.IsBlocked));

        var invites = await _db.AdminInvites
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new AdminUserDto(x.Id.ToString(), x.Email, x.Role, x.Blocked))
            .ToListAsync();

        var merged = realAdmins
            .Concat(invites)
            .GroupBy(x => x.Email, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

        return Ok(merged);
    }

    [HttpPost("admins/invite")]
    public async Task<IActionResult> InviteAdmin([FromBody] AdminInviteDto dto)
    {
        var existing = await _db.AdminInvites.FirstOrDefaultAsync(x => x.Email == dto.Email);
        if (existing != null)
        {
            existing.Role = dto.Role;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            await _db.AdminInvites.AddAsync(new AdminInvite
            {
                Id = Guid.NewGuid(),
                Email = dto.Email,
                Role = dto.Role,
                Blocked = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var created = await _db.AdminInvites.AsNoTracking().FirstAsync(x => x.Email == dto.Email);
        return Ok(new AdminUserDto(created.Id.ToString(), created.Email, created.Role, created.Blocked));
    }

    [HttpPost("admins/invite-batch")]
    public async Task<IActionResult> InviteAdmins([FromBody] AdminInviteBatchDto dto)
    {
        foreach (var email in dto.Emails)
        {
            var existing = await _db.AdminInvites.FirstOrDefaultAsync(x => x.Email == email);
            if (existing != null)
            {
                existing.Role = dto.Role;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _db.AdminInvites.AddAsync(new AdminInvite
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    Role = dto.Role,
                    Blocked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("admins/{id}/logs")]
    public async Task<IActionResult> GetAdminLogs(string id)
    {
        Guid? actorUserId = Guid.TryParse(id, out var parsed) ? parsed : null;

        var query = _db.AuditLogs.AsNoTracking();
        if (actorUserId.HasValue)
        {
            query = query.Where(x => x.ActorUserId == actorUserId.Value || x.ActorEmail == id);
        }
        else
        {
            query = query.Where(x => x.ActorEmail == id);
        }

        var logs = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new
            {
                id = x.Id.ToString(),
                action = x.Action,
                details = x.MetadataJson,
                actor = x.ActorEmail,
                createdAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost("admins/{id}/{action}")]
    public async Task<IActionResult> ToggleAdmin(string id, string action)
    {
        if (!Guid.TryParse(id, out var adminId))
        {
            return NotFound();
        }

        var user = await _users.GetByIdAsync(adminId);
        if (user != null)
        {
            if (action.Equals("block", StringComparison.OrdinalIgnoreCase))
            {
                user.IsBlocked = true;
            }
            else if (action.Equals("unblock", StringComparison.OrdinalIgnoreCase))
            {
                user.IsBlocked = false;
            }

            await _users.UpdateAsync(user);
            return Ok(new { success = true, id = user.Id.ToString(), blocked = user.IsBlocked });
        }

        var invite = await _db.AdminInvites.FirstOrDefaultAsync(x => x.Id == adminId);
        if (invite != null)
        {
            if (action.Equals("block", StringComparison.OrdinalIgnoreCase))
            {
                invite.Blocked = true;
            }
            else if (action.Equals("unblock", StringComparison.OrdinalIgnoreCase))
            {
                invite.Blocked = false;
            }

            invite.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, id = invite.Id.ToString(), blocked = invite.Blocked });
        }

        return NotFound();
    }

    [HttpPatch("admins/{id}/role")]
    public async Task<IActionResult> UpdateAdminRole(string id, [FromBody] AdminRoleDto dto)
    {
        if (!Guid.TryParse(id, out var adminId))
        {
            return NotFound();
        }

        var user = await _users.GetByIdAsync(adminId);
        if (user != null)
        {
            user.Role = dto.Role;
            await _users.UpdateAsync(user);
            return Ok(new { id, role = user.Role });
        }

        var invite = await _db.AdminInvites.FirstOrDefaultAsync(x => x.Id == adminId);
        if (invite != null)
        {
            invite.Role = dto.Role;
            invite.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { id, role = invite.Role });
        }

        return NotFound();
    }

    #endregion

    #region Coupons

    [HttpGet("promotions/coupons")]
    public async Task<IActionResult> GetCoupons()
    {
        var coupons = (await _couponRepository.GetAllAsync())
            .Select(x => new CouponDto(x.Id.ToString(), x.Code, x.Discount, x.Active))
            .ToList();

        return Ok(coupons);
    }

    [HttpPost("promotions/coupons")]
    public async Task<IActionResult> CreateCoupon([FromBody] CouponDto dto)
    {
        var now = DateTime.UtcNow;
        var entity = new Coupon
        {
            Id = Guid.NewGuid(),
            Code = (dto.Code ?? string.Empty).Trim(),
            Discount = dto.Discount,
            Active = dto.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _couponRepository.AddAsync(entity);

        return Ok(new CouponDto(entity.Id.ToString(), entity.Code, entity.Discount, entity.Active));
    }

    [HttpGet("promotions/coupons/{id}")]
    public async Task<IActionResult> GetCoupon(string id)
    {
        if (!Guid.TryParse(id, out var couponId))
        {
            return NotFound();
        }

        var coupon = await _couponRepository.GetByIdAsync(couponId);
        if (coupon == null)
        {
            return NotFound();
        }

        return Ok(new CouponDto(coupon.Id.ToString(), coupon.Code, coupon.Discount, coupon.Active));
    }

    [HttpPut("promotions/coupons/{id}")]
    public async Task<IActionResult> UpdateCoupon(string id, [FromBody] CouponDto dto)
    {
        if (!Guid.TryParse(id, out var couponId))
        {
            return NotFound();
        }

        var coupon = await _couponRepository.GetByIdAsync(couponId);
        if (coupon == null)
        {
            return NotFound();
        }

        coupon.Code = (dto.Code ?? string.Empty).Trim();
        coupon.Discount = dto.Discount;
        coupon.Active = dto.Active;
        coupon.UpdatedAt = DateTime.UtcNow;

        await _couponRepository.UpdateAsync(coupon);

        return Ok(new CouponDto(coupon.Id.ToString(), coupon.Code, coupon.Discount, coupon.Active));
    }

    #endregion

    #region Banners

    [HttpGet("banners")]
    public async Task<IActionResult> GetBanners()
    {
        var banners = (await _bannerRepository.GetAllAsync())
            .Select(x => new BannerDto(x.Id.ToString(), x.Title, x.Image, x.Link, x.Active, x.StartDate, x.EndDate))
            .ToList();

        return Ok(banners);
    }

    [HttpPost("banners")]
    public async Task<IActionResult> CreateBanner([FromBody] BannerDto dto)
    {
        var existing = (await _bannerRepository.GetAllAsync()).ToList();
        var now = DateTime.UtcNow;

        var entity = new Banner
        {
            Id = Guid.NewGuid(),
            Title = dto.Title ?? string.Empty,
            Image = dto.Image ?? string.Empty,
            Link = dto.Link ?? string.Empty,
            Active = dto.Active,
            StartDate = dto.StartDate ?? string.Empty,
            EndDate = dto.EndDate ?? string.Empty,
            DisplayOrder = existing.Count,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _bannerRepository.AddAsync(entity);

        return Ok(new BannerDto(entity.Id.ToString(), entity.Title, entity.Image, entity.Link, entity.Active, entity.StartDate, entity.EndDate));
    }

    [HttpPut("banners/{id}")]
    public async Task<IActionResult> UpdateBanner(string id, [FromBody] BannerDto dto)
    {
        if (!Guid.TryParse(id, out var bannerId))
        {
            return NotFound();
        }

        var banner = await _bannerRepository.GetByIdAsync(bannerId);
        if (banner == null)
        {
            return NotFound();
        }

        banner.Title = dto.Title ?? string.Empty;
        banner.Image = dto.Image ?? string.Empty;
        banner.Link = dto.Link ?? string.Empty;
        banner.Active = dto.Active;
        banner.StartDate = dto.StartDate ?? string.Empty;
        banner.EndDate = dto.EndDate ?? string.Empty;
        banner.UpdatedAt = DateTime.UtcNow;

        await _bannerRepository.UpdateAsync(banner);

        return Ok(new BannerDto(banner.Id.ToString(), banner.Title, banner.Image, banner.Link, banner.Active, banner.StartDate, banner.EndDate));
    }

    [HttpDelete("banners/{id}")]
    public async Task<IActionResult> DeleteBanner(string id)
    {
        if (!Guid.TryParse(id, out var bannerId))
        {
            return NotFound();
        }

        await _bannerRepository.DeleteAsync(bannerId);

        var all = (await _bannerRepository.GetAllAsync()).ToList();
        for (var i = 0; i < all.Count; i++)
        {
            if (all[i].DisplayOrder != i)
            {
                all[i].DisplayOrder = i;
                all[i].UpdatedAt = DateTime.UtcNow;
                await _bannerRepository.UpdateAsync(all[i]);
            }
        }

        return Ok(new { success = true });
    }

    [HttpPost("banners/{id}/move")]
    public async Task<IActionResult> MoveBanner(string id, [FromBody] BannerMoveDto dto)
    {
        if (!Guid.TryParse(id, out var bannerId))
        {
            return NotFound();
        }

        var all = (await _bannerRepository.GetAllAsync()).ToList();
        var index = all.FindIndex(x => x.Id == bannerId);
        if (index < 0)
        {
            return NotFound();
        }

        var targetIndex = dto.Direction.Equals("up", StringComparison.OrdinalIgnoreCase)
            ? Math.Max(0, index - 1)
            : Math.Min(all.Count - 1, index + 1);

        if (targetIndex == index)
        {
            return Ok(new { id, dto.Direction });
        }

        (all[index], all[targetIndex]) = (all[targetIndex], all[index]);

        for (var i = 0; i < all.Count; i++)
        {
            if (all[i].DisplayOrder != i)
            {
                all[i].DisplayOrder = i;
                all[i].UpdatedAt = DateTime.UtcNow;
                await _bannerRepository.UpdateAsync(all[i]);
            }
        }

        return Ok(new { id, dto.Direction });
    }

    [HttpPatch("banners/{id}/move")]
    public Task<IActionResult> MoveBannerPatch(string id, [FromBody] BannerMoveDto dto) => MoveBanner(id, dto);

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

public record EmailTemplateDto
{
    public string Template { get; init; } = string.Empty;
}

public record ProfileDto
{
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Avatar { get; init; } = string.Empty;
    public Dictionary<string, object> Preferences { get; init; } = new();
}




public record AntiAbuseRouteClassDto(string Key, string Label, int RulesCount, int MinLimit, int MaxLimit, List<string> Endpoints, List<string> CoupledAlerts, bool ExpectedAlertCoverage);



