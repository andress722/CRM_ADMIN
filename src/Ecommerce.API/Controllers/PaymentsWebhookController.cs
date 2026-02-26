using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/webhooks/mercadopago")]
public class PaymentsWebhookController : ControllerBase
{
    private readonly PaymentService _payments;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsWebhookController> _logger;

    public PaymentsWebhookController(
        PaymentService payments,
        IConfiguration configuration,
        ILogger<PaymentsWebhookController> logger)
    {
        _payments = payments;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Handle([FromQuery] string? id, [FromQuery] string? type)
    {
        if (Request.ContentType is null || !Request.ContentType.Contains("application/json", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status415UnsupportedMediaType, new { message = "Content-Type must be application/json" });
        }

        var body = await ReadBodyAsync();
        if (string.IsNullOrWhiteSpace(body))
        {
            return BadRequest(new { message = "Empty payload" });
        }

        try
        {
            using var _ = JsonDocument.Parse(body);
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Invalid JSON payload" });
        }

        var secret = _configuration["Payments:MercadoPago:WebhookSecret"];
        if (!string.IsNullOrWhiteSpace(secret))
        {
            if (!ValidateSignature(secret, body))
            {
                _logger.LogWarning("Invalid Mercado Pago webhook signature");
                return Unauthorized(new { message = "Invalid signature" });
            }
        }

        var transactionId = id;
        if (string.IsNullOrWhiteSpace(transactionId))
        {
            transactionId = TryExtractTransactionId(body);
        }

        if (string.IsNullOrWhiteSpace(transactionId))
        {
            return BadRequest(new { message = "Missing transaction id" });
        }

        var updated = await _payments.ProcessGatewayNotificationAsync(transactionId);
        if (!updated)
        {
            _logger.LogWarning("Mercado Pago webhook payment not found for transaction {TransactionId}", transactionId);
            return NotFound(new { message = "Payment not found" });
        }

        return Ok(new { message = "Payment updated", type });
    }

    private static string? TryExtractTransactionId(string payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            if (root.TryGetProperty("data", out var data) && data.TryGetProperty("id", out var dataId))
            {
                return dataId.GetString();
            }

            if (root.TryGetProperty("id", out var id))
            {
                return id.GetString();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private bool ValidateSignature(string secret, string body)
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

        var format = _configuration["Payments:MercadoPago:WebhookSignatureFormat"];
        var candidates = BuildCandidates(format, ts ?? string.Empty, requestId, body);
        return candidates.Any(candidate =>
            string.Equals(ComputeHmacSha256(secret, candidate), v1, StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<string> BuildCandidates(string? format, string ts, string requestId, string body)
    {
        if (!string.IsNullOrWhiteSpace(format))
        {
            return format switch
            {
                "ts_requestid_body" => new[] { $"{ts}.{requestId}.{body}" },
                "ts_body" => new[] { $"{ts}.{body}" },
                "body" => new[] { body },
                _ => new[] { $"{ts}.{requestId}.{body}" }
            };
        }

        return new[]
        {
            $"{ts}.{requestId}.{body}",
            $"{ts}.{body}",
            body
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

    private async Task<string> ReadBodyAsync()
    {
        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;
        return body;
    }
}
