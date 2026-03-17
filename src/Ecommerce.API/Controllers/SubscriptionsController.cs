using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Configuration;
using Ecommerce.API.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly SubscriptionService _service;
    private readonly IConfiguration _configuration;
    private readonly IIdempotencyService _idempotencyService;

    public SubscriptionsController(
        SubscriptionService service,
        IConfiguration configuration,
        IIdempotencyService idempotencyService)
    {
        _service = service;
        _configuration = configuration;
        _idempotencyService = idempotencyService;
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public IActionResult GetPlans()
    {
        var configuredPlans = _configuration
            .GetSection("Subscriptions:Plans")
            .Get<List<SubscriptionPlanDto>>();

        if (configuredPlans != null && configuredPlans.Count > 0)
        {
            return Ok(configuredPlans);
        }

        var defaults = new List<SubscriptionPlanDto>
        {
            new()
            {
                Id = "starter",
                Name = "Starter",
                Price = 19.9m,
                Interval = "month",
                Highlighted = false,
                Features = new List<string> { "Frete com desconto", "Ofertas semanais" }
            },
            new()
            {
                Id = "pro",
                Name = "Pro",
                Price = 49.9m,
                Interval = "month",
                Highlighted = true,
                Features = new List<string> { "Frete gratis", "Suporte prioritario", "Cashback aumentado" }
            },
            new()
            {
                Id = "elite",
                Name = "Elite",
                Price = 99.9m,
                Interval = "month",
                Highlighted = false,
                Features = new List<string> { "Frete expresso gratis", "Ofertas exclusivas", "Atendimento dedicado" }
            }
        };

        return Ok(defaults);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] SubscriptionRequest request)
    {
        try
        {
            var subscription = await _service.CreateSubscriptionAsync(request.Plan, request.Email);
            return Ok(subscription);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id)
    {
        try
        {
            var subscription = await _service.GetSubscriptionAsync(id);
            return Ok(subscription);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var cancelled = await _service.CancelSubscriptionAsync(id);
            return Ok(cancelled);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/retry")]
    [Authorize]
    public async Task<IActionResult> Retry(Guid id)
    {
        try
        {
            var subscription = await _service.RetryBillingAsync(id);
            return Ok(subscription);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("billing/run")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RunDueBilling([FromQuery] int batchSize = 100)
    {
        var result = await _service.ProcessDueBillingsAsync(batchSize);
        return Ok(result);
    }

    [HttpPost("webhooks/billing")]
    [AllowAnonymous]
    public async Task<IActionResult> BillingWebhook([FromBody] BillingWebhookRequest request)
    {
        if (request.SubscriptionId == Guid.Empty || string.IsNullOrWhiteSpace(request.Event))
        {
            return BadRequest(new { message = "subscriptionId and event are required" });
        }

        var secret = _configuration["Subscriptions:Billing:WebhookSecret"];
        if (!string.IsNullOrWhiteSpace(secret))
        {
            var payload = await ReadBodyAsync();
            if (string.IsNullOrWhiteSpace(payload))
            {
                payload = JsonSerializer.Serialize(request);
            }

            var hasLegacySecret = IsLegacySecretValid(secret);
            var hasSignature = IsSignatureValid(secret, payload);
            if (!hasLegacySecret && !hasSignature)
            {
                return Unauthorized(new { message = "Invalid webhook signature" });
            }
        }

        var webhookKey = Request.Headers["x-request-id"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(webhookKey))
        {
            webhookKey = $"{request.SubscriptionId:N}:{request.Event}:{request.TransactionId}:{request.OccurredAt?.ToUniversalTime().ToString("O")}";
        }

        var requestHash = _idempotencyService.ComputeRequestHash(request);
        var existing = await _idempotencyService.GetAsync("subscriptions:webhook", webhookKey, HttpContext.RequestAborted);
        if (existing != null)
        {
            if (!string.Equals(existing.RequestHash, requestHash, StringComparison.Ordinal))
            {
                return Conflict(new { message = "Idempotency key reuse with different payload" });
            }

            return StatusCode(existing.ResponseStatusCode, new { message = "Duplicate webhook ignored" });
        }

        var handled = await _service.HandleBillingWebhookAsync(
            new SubscriptionService.SubscriptionWebhookEvent(
                request.SubscriptionId,
                request.Event,
                request.TransactionId,
                request.Error,
                request.OccurredAt));

        if (!handled)
        {
            return NotFound(new { message = "Subscription not found or unsupported event" });
        }

        var responsePayload = new { success = true };
        await _idempotencyService.SaveAsync(
            "subscriptions:webhook",
            webhookKey,
            requestHash,
            StatusCodes.Status200OK,
            responsePayload,
            TimeSpan.FromHours(24),
            HttpContext.RequestAborted);

        return Ok(responsePayload);
    }

    private async Task<string> ReadBodyAsync()
    {
        Request.EnableBuffering();
        if (Request.Body.CanSeek)
        {
            Request.Body.Position = 0;
        }

        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();

        if (Request.Body.CanSeek)
        {
            Request.Body.Position = 0;
        }

        return body;
    }

    private bool IsLegacySecretValid(string secret)
    {
        var provided = Request.Headers["x-subscription-webhook-secret"].FirstOrDefault();
        return string.Equals(secret, provided, StringComparison.Ordinal);
    }

    private bool IsSignatureValid(string secret, string payload)
    {
        var signature = Request.Headers["x-signature"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var requestId = Request.Headers["x-request-id"].FirstOrDefault() ?? string.Empty;
        var parts = signature.Split(',', ';', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Split('=', 2, StringSplitOptions.RemoveEmptyEntries))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim(), p => p[1].Trim(), StringComparer.OrdinalIgnoreCase);

        parts.TryGetValue("ts", out var ts);
        parts.TryGetValue("v1", out var v1);
        if (string.IsNullOrWhiteSpace(v1))
        {
            parts.TryGetValue("signature", out v1);
        }

        if (string.IsNullOrWhiteSpace(v1))
        {
            return false;
        }

        var format = _configuration["Subscriptions:Billing:WebhookSignatureFormat"];
        var candidates = BuildCandidates(format, ts ?? string.Empty, requestId, payload);
        return candidates.Any(candidate => string.Equals(
            ComputeHmacSha256(secret, candidate),
            v1,
            StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<string> BuildCandidates(string? format, string ts, string requestId, string payload)
    {
        if (!string.IsNullOrWhiteSpace(format))
        {
            return format switch
            {
                "ts_requestid_body" => new[] { $"{ts}.{requestId}.{payload}" },
                "ts_body" => new[] { $"{ts}.{payload}" },
                "body" => new[] { payload },
                _ => new[] { $"{ts}.{requestId}.{payload}" }
            };
        }

        return new[]
        {
            $"{ts}.{requestId}.{payload}",
            $"{ts}.{payload}",
            payload
        };
    }

    private static string ComputeHmacSha256(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    public record SubscriptionRequest(string Plan, string Email);

    public record BillingWebhookRequest(
        Guid SubscriptionId,
        string Event,
        string? TransactionId,
        string? Error,
        DateTime? OccurredAt);

    public class SubscriptionPlanDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Interval { get; set; } = "month";
        public bool Highlighted { get; set; }
        public List<string> Features { get; set; } = new();
    }
}
