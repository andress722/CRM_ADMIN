using System.Text.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/admin/ops/deploy-signal")]
public class DeploySignalsController : ControllerBase
{
    private readonly EcommerceDbContext _db;
    private readonly IConfiguration _configuration;

    public DeploySignalsController(EcommerceDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Ingest([FromBody] DeploySignalRequest request)
    {
        var configuredSecret = _configuration["DeploySignals:SharedSecret"];
        if (string.IsNullOrWhiteSpace(configuredSecret))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Deploy signal secret is not configured" });
        }

        var receivedSecret = Request.Headers["X-Deploy-Signal-Secret"].FirstOrDefault();
        if (!string.Equals(receivedSecret, configuredSecret, StringComparison.Ordinal))
        {
            return Unauthorized(new { message = "Invalid deploy signal secret" });
        }

        var normalizedStatus = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (normalizedStatus is not ("success" or "succeeded" or "failure" or "failed" or "error" or "cancelled" or "timed_out"))
        {
            return BadRequest(new { message = "Status must be one of: success, succeeded, failure, failed, error, cancelled, timed_out" });
        }

        var occurredAtUtc = request.OccurredAtUtc?.ToUniversalTime() ?? DateTime.UtcNow;
        var payload = new
        {
            status = normalizedStatus,
            source = string.IsNullOrWhiteSpace(request.Source) ? "github-actions" : request.Source.Trim(),
            workflow = request.Workflow?.Trim(),
            branch = request.Branch?.Trim(),
            commitSha = request.CommitSha?.Trim(),
            runId = request.RunId?.Trim(),
            runUrl = request.RunUrl?.Trim(),
            environment = request.Environment?.Trim(),
            message = request.Message?.Trim(),
            occurredAtUtc = occurredAtUtc.ToString("o")
        };

        var audit = new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = null,
            ActorEmail = "ci@deploy-signal.local",
            Action = "Status",
            EntityType = "DeploySignal",
            EntityId = string.IsNullOrWhiteSpace(request.RunId) ? Guid.NewGuid().ToString("N") : request.RunId,
            MetadataJson = JsonSerializer.Serialize(payload),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            CreatedAt = occurredAtUtc
        };

        _db.AuditLogs.Add(audit);
        await _db.SaveChangesAsync();

        return Accepted(new
        {
            received = true,
            status = normalizedStatus,
            atUtc = occurredAtUtc.ToString("o")
        });
    }

    public sealed record DeploySignalRequest(
        string? Status,
        string? Source,
        string? Workflow,
        string? Branch,
        string? CommitSha,
        string? RunId,
        string? RunUrl,
        string? Environment,
        string? Message,
        DateTime? OccurredAtUtc);
}
