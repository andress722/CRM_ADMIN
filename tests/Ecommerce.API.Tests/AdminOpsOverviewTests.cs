using System.Net;
using System.Net.Http.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class AdminOpsOverviewTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public AdminOpsOverviewTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetOverview_ReturnsOperationalSummaryForAdmin()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var webhook = new Webhook
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/hook",
                EventTypes = "order.created",
                Secret = "secret",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            db.Webhooks.Add(webhook);
            db.WebhookDeliveries.Add(new WebhookDelivery
            {
                Id = Guid.NewGuid(),
                WebhookId = webhook.Id,
                EventType = "order.created",
                Payload = "{}",
                Attempt = 1,
                Status = "Failed",
                CreatedAt = DateTime.UtcNow,
            });

            db.Subscriptions.Add(new Subscription
            {
                Id = Guid.NewGuid(),
                Plan = "Pro",
                Email = "ops@example.com",
                Status = "Active",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                NextBillingAt = DateTime.UtcNow.AddMinutes(-5),
                BillingRetryCount = 1,
            });

            db.CartItems.Add(new CartItem
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                ProductId = Guid.NewGuid(),
                Quantity = 1,
                AddedAt = DateTime.UtcNow.AddHours(-30),
            });

            db.EmailLogs.Add(new EmailLog
            {
                Id = Guid.NewGuid(),
                To = "ops@example.com",
                Subject = "failed email",
                Body = "body",
                Status = "Failed",
                Error = "smtp timeout",
                CreatedAt = DateTime.UtcNow,
            });

            db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorEmail = "ci@deploy-signal.local",
                Action = "Status",
                EntityType = "DeploySignal",
                EntityId = "run-001",
                MetadataJson = "{\"status\":\"failed\",\"source\":\"github-actions\",\"workflow\":\"CI Integration\",\"occurredAtUtc\":\"" + DateTime.UtcNow.ToString("O") + "\"}",
                CreatedAt = DateTime.UtcNow,
            });

            await db.SaveChangesAsync();
        }

        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/v1/admin/ops/overview");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<AdminOpsOverviewResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Slo);
        Assert.NotNull(payload.Backup);
        Assert.NotNull(payload.Webhooks);
        Assert.NotNull(payload.Jobs);
        Assert.NotNull(payload.Alerts);
        Assert.True(payload.Webhooks.ActiveEndpoints >= 1);
        Assert.True(payload.Webhooks.FailedDeliveriesLast24h >= 1);
        Assert.True(payload.Jobs.DueSubscriptions + payload.Jobs.RetryingSubscriptions >= 1);
        Assert.True(payload.Jobs.StaleCartUsers >= 1);
        Assert.True(payload.Jobs.FailedEmailsLast24h >= 1);
        Assert.True(payload.Alerts.DeployFailure.Triggered);
    }

    [Fact]
    public async Task DeploySignalEndpoint_WithValidSecret_StoresSignalAndReturnsAccepted()
    {
        var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/ops/deploy-signal")
        {
            Content = JsonContent.Create(new
            {
                status = "failed",
                source = "github-actions",
                workflow = "CI",
                branch = "main",
                commitSha = "abc123",
                runId = "run-42",
                runUrl = "https://github.com/example/actions/runs/42",
                environment = "staging"
            })
        };

        request.Headers.Add("X-Deploy-Signal-Secret", "test-deploy-signal-secret");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var signal = db.AuditLogs
            .Where(x => x.EntityType == "DeploySignal" && x.EntityId == "run-42")
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        Assert.NotNull(signal);
        Assert.Contains("failed", signal!.MetadataJson, StringComparison.OrdinalIgnoreCase);
    }

    public sealed record AdminOpsOverviewResponse(
        SloResponse Slo,
        BackupResponse Backup,
        WebhookResponse Webhooks,
        JobResponse Jobs,
        AlertResponse Alerts);

    public sealed record SloResponse(
        long TotalRequests,
        long TotalResponses,
        long Total4xx,
        long Total5xx,
        double AvgLatencyMs,
        double P95LatencyMs,
        double ErrorRate);

    public sealed record BackupResponse(bool Healthy, string Message);

    public sealed record WebhookResponse(
        int ActiveEndpoints,
        int PendingDeliveries,
        int FailedDeliveriesLast24h,
        int SuccessfulDeliveriesLast24h,
        DateTime? LatestFailureAtUtc);

    public sealed record JobResponse(
        int DueSubscriptions,
        int RetryingSubscriptions,
        int StaleCartUsers,
        int FailedEmailsLast24h);

    public sealed record AlertStatusResponse(string Key, bool Triggered, string Message);

    public sealed record AlertResponse(
        AlertStatusResponse Api5xx,
        AlertStatusResponse ApiP95Latency,
        AlertStatusResponse WebhookBacklog,
        AlertStatusResponse BackupHealth,
        AlertStatusResponse DeployFailure);
}
