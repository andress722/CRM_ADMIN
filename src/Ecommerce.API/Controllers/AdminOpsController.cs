using System.Text.Json;
using Ecommerce.API.Services;
using Ecommerce.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/ops")]
public class AdminOpsController : ControllerBase
{
    private readonly MetricsRegistry _metrics;
    private readonly DataGovernanceService _governance;
    private readonly EcommerceDbContext _db;
    private readonly IConfiguration _configuration;

    public AdminOpsController(MetricsRegistry metrics, DataGovernanceService governance, EcommerceDbContext db, IConfiguration configuration)
    {
        _metrics = metrics;
        _governance = governance;
        _db = db;
        _configuration = configuration;
    }

    [HttpGet("slo")]
    public IActionResult GetSloSnapshot()
    {
        return Ok(_metrics.Snapshot());
    }

    [HttpGet("backup-status")]
    public IActionResult GetBackupStatus()
    {
        var result = _governance.CheckBackupHealth();
        return Ok(new { healthy = result.healthy, message = result.message });
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var now = DateTime.UtcNow;
        var last24Hours = now.AddHours(-24);
        var staleCartCutoff = now.AddHours(-24);
        var backup = _governance.CheckBackupHealth();
        var slo = _metrics.Snapshot();

        var activeWebhooks = await _db.Webhooks.AsNoTracking().CountAsync(x => x.IsActive);
        var pendingWebhookDeliveries = await _db.WebhookDeliveries.AsNoTracking().CountAsync(x => x.Status == "Pending");
        var failedWebhookDeliveries24h = await _db.WebhookDeliveries.AsNoTracking().CountAsync(x => x.Status == "Failed" && x.CreatedAt >= last24Hours);
        var successfulWebhookDeliveries24h = await _db.WebhookDeliveries.AsNoTracking().CountAsync(x => x.Status == "Success" && x.CreatedAt >= last24Hours);
        var latestWebhookFailure = await _db.WebhookDeliveries
            .AsNoTracking()
            .Where(x => x.Status == "Failed")
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        var dueSubscriptions = await _db.Subscriptions
            .AsNoTracking()
            .CountAsync(x => x.Status == "Active" && x.NextBillingAt != null && x.NextBillingAt <= now);
        var retryingSubscriptions = await _db.Subscriptions
            .AsNoTracking()
            .CountAsync(x => x.BillingRetryCount > 0 && x.Status != "Cancelled");
        var staleCartUsers = await _db.CartItems
            .AsNoTracking()
            .Where(x => x.AddedAt <= staleCartCutoff)
            .Select(x => x.UserId)
            .Distinct()
            .CountAsync();
        var failedEmails24h = await _db.EmailLogs
            .AsNoTracking()
            .CountAsync(x => x.Status != "Sent" && x.CreatedAt >= last24Hours);

        var deploySignal = await GetLatestDeploySignalAsync();
        var deployAlert = BuildDeployAlert(deploySignal, now);

        var alerts = new OpsAlertSummaryDto(
            new AlertStatusDto("api_5xx", slo.Total5xx > 0, slo.Total5xx > 0 ? $"{slo.Total5xx} respostas 5xx observadas." : "Sem respostas 5xx observadas."),
            new AlertStatusDto("api_p95_latency", slo.P95LatencyMs >= 1200, $"P95 atual {slo.P95LatencyMs:0} ms."),
            new AlertStatusDto("webhook_backlog", pendingWebhookDeliveries > 0 || failedWebhookDeliveries24h > 0, $"Pendentes={pendingWebhookDeliveries}; falhas24h={failedWebhookDeliveries24h}."),
            new AlertStatusDto("backup_health", !backup.healthy, backup.message),
            deployAlert);

        return Ok(new AdminOpsOverviewDto(
            slo,
            new BackupHealthDto(backup.healthy, backup.message),
            new WebhookHealthDto(activeWebhooks, pendingWebhookDeliveries, failedWebhookDeliveries24h, successfulWebhookDeliveries24h, latestWebhookFailure),
            new JobQueueHealthDto(dueSubscriptions, retryingSubscriptions, staleCartUsers, failedEmails24h),
            alerts));
    }

    private AlertStatusDto BuildDeployAlert(DeploySignalSnapshot? signal, DateTime now)
    {
        var freshnessHours = Math.Max(1, _configuration.GetValue("DeploySignals:FreshnessHours", 24));
        if (signal == null)
        {
            return new AlertStatusDto("deploy_failure", false, $"Sem sinais de deploy registrados nas ultimas {freshnessHours}h.");
        }

        if (signal.OccurredAtUtc < now.AddHours(-freshnessHours))
        {
            return new AlertStatusDto("deploy_failure", false, $"Ultimo sinal de deploy esta vencido ({signal.OccurredAtUtc:O}).");
        }

        var failed = IsFailureStatus(signal.Status);
        var source = string.IsNullOrWhiteSpace(signal.Source) ? "unknown" : signal.Source;
        var workflow = string.IsNullOrWhiteSpace(signal.Workflow) ? "n/a" : signal.Workflow;
        var message = failed
            ? $"Deploy com falha detectado ({signal.Status}) em {signal.OccurredAtUtc:O}. source={source}; workflow={workflow}."
            : $"Ultimo deploy reportado como {signal.Status} em {signal.OccurredAtUtc:O}. source={source}; workflow={workflow}.";

        return new AlertStatusDto("deploy_failure", failed, message);
    }

    private static bool IsFailureStatus(string status)
        => status is "failed" or "failure" or "error" or "cancelled" or "timed_out";

    private async Task<DeploySignalSnapshot?> GetLatestDeploySignalAsync()
    {
        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Where(x => x.EntityType == "DeploySignal" && x.Action == "Status")
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync();

        foreach (var log in logs)
        {
            if (string.IsNullOrWhiteSpace(log.MetadataJson))
            {
                continue;
            }

            try
            {
                using var doc = JsonDocument.Parse(log.MetadataJson);
                var root = doc.RootElement;
                var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : null;
                if (string.IsNullOrWhiteSpace(status))
                {
                    continue;
                }

                var occurredAtUtc = root.TryGetProperty("occurredAtUtc", out var occurredAtProp)
                    && DateTime.TryParse(occurredAtProp.GetString(), out var parsedOccurredAt)
                    ? parsedOccurredAt.ToUniversalTime()
                    : log.CreatedAt.ToUniversalTime();

                return new DeploySignalSnapshot(
                    status.Trim().ToLowerInvariant(),
                    root.TryGetProperty("source", out var sourceProp) ? sourceProp.GetString() : null,
                    root.TryGetProperty("workflow", out var workflowProp) ? workflowProp.GetString() : null,
                    root.TryGetProperty("branch", out var branchProp) ? branchProp.GetString() : null,
                    root.TryGetProperty("commitSha", out var commitProp) ? commitProp.GetString() : null,
                    root.TryGetProperty("message", out var messageProp) ? messageProp.GetString() : null,
                    occurredAtUtc);
            }
            catch
            {
                // Ignore malformed historical payloads and continue.
            }
        }

        return null;
    }

    private sealed record DeploySignalSnapshot(
        string Status,
        string? Source,
        string? Workflow,
        string? Branch,
        string? CommitSha,
        string? Message,
        DateTime OccurredAtUtc);

    public sealed record BackupHealthDto(bool Healthy, string Message);

    public sealed record WebhookHealthDto(
        int ActiveEndpoints,
        int PendingDeliveries,
        int FailedDeliveriesLast24h,
        int SuccessfulDeliveriesLast24h,
        DateTime? LatestFailureAtUtc);

    public sealed record JobQueueHealthDto(
        int DueSubscriptions,
        int RetryingSubscriptions,
        int StaleCartUsers,
        int FailedEmailsLast24h);

    public sealed record AlertStatusDto(string Key, bool Triggered, string Message);

    public sealed record OpsAlertSummaryDto(
        AlertStatusDto Api5xx,
        AlertStatusDto ApiP95Latency,
        AlertStatusDto WebhookBacklog,
        AlertStatusDto BackupHealth,
        AlertStatusDto DeployFailure);

    public sealed record AdminOpsOverviewDto(
        MetricsRegistry.MetricsSnapshot Slo,
        BackupHealthDto Backup,
        WebhookHealthDto Webhooks,
        JobQueueHealthDto Jobs,
        OpsAlertSummaryDto Alerts);
}
