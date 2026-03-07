using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services;

public class SubscriptionService
{
    private const string StatusActive = "Active";
    private const string StatusPastDue = "PastDue";
    private const string StatusCancelled = "Cancelled";

    private readonly ISubscriptionRepository _repository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(
        ISubscriptionRepository repository,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SubscriptionService> logger)
    {
        _repository = repository;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<Subscription> CreateSubscriptionAsync(string plan, string email)
    {
        if (string.IsNullOrWhiteSpace(plan) || string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Plan and email are required");
        }

        if (!TryResolvePlan(plan, out var resolvedPlan))
        {
            throw new ArgumentException("Invalid plan");
        }

        var now = DateTime.UtcNow;
        var periodEnd = AddBillingPeriod(now, resolvedPlan.Interval);

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            Plan = resolvedPlan.Id,
            Email = email.Trim(),
            Status = StatusActive,
            CreatedAt = now,
            LastBilledAt = now,
            NextBillingAt = periodEnd,
            CurrentPeriodStartAt = now,
            CurrentPeriodEndAt = periodEnd,
            BillingRetryCount = 0
        };

        await _repository.AddAsync(subscription);
        return subscription;
    }

    public async Task<Subscription> GetSubscriptionAsync(Guid id)
    {
        var subscription = await _repository.GetByIdAsync(id);
        if (subscription == null)
        {
            throw new KeyNotFoundException("Subscription not found");
        }

        return subscription;
    }

    public async Task<Subscription> CancelSubscriptionAsync(Guid id)
    {
        var subscription = await GetSubscriptionAsync(id);
        subscription.Status = StatusCancelled;
        subscription.CancelledAt = DateTime.UtcNow;
        subscription.NextBillingAt = null;
        await _repository.UpdateAsync(subscription);
        return subscription;
    }

    public async Task<Subscription> RetryBillingAsync(Guid id)
    {
        var subscription = await GetSubscriptionAsync(id);
        if (string.Equals(subscription.Status, StatusCancelled, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Subscription is cancelled");
        }

        return await ProcessBillingAttemptAsync(subscription, DateTime.UtcNow, manualRetry: true);
    }

    public async Task<BillingRunResult> ProcessDueBillingsAsync(int? batchSize = null)
    {
        var now = DateTime.UtcNow;
        var take = batchSize.GetValueOrDefault(_configuration.GetValue("Subscriptions:Billing:WorkerBatchSize", 100));
        if (take <= 0)
        {
            take = 100;
        }

        var due = await _repository.GetDueForBillingAsync(now, take);
        var succeeded = 0;
        var failed = 0;

        foreach (var subscription in due)
        {
            var beforeStatus = subscription.Status;
            var updated = await ProcessBillingAttemptAsync(subscription, now, manualRetry: false);
            if (string.Equals(updated.Status, StatusActive, StringComparison.OrdinalIgnoreCase) && !string.Equals(beforeStatus, StatusActive, StringComparison.OrdinalIgnoreCase))
            {
                succeeded++;
            }
            else if (!string.Equals(updated.Status, StatusActive, StringComparison.OrdinalIgnoreCase))
            {
                failed++;
            }
        }

        return new BillingRunResult(due.Count, succeeded, failed);
    }

    public async Task<bool> HandleBillingWebhookAsync(SubscriptionWebhookEvent webhookEvent)
    {
        var subscription = await _repository.GetByIdAsync(webhookEvent.SubscriptionId);
        if (subscription == null)
        {
            return false;
        }

        var eventType = (webhookEvent.Event ?? string.Empty).Trim().ToLowerInvariant();
        var occurredAt = webhookEvent.OccurredAt ?? DateTime.UtcNow;

        switch (eventType)
        {
            case "payment_succeeded":
            case "billing_succeeded":
            case "succeeded":
                ApplyBillingSuccess(subscription, occurredAt, webhookEvent.TransactionId);
                break;

            case "payment_failed":
            case "billing_failed":
            case "failed":
                ApplyBillingFailure(subscription, occurredAt, webhookEvent.Error ?? "billing_failed_webhook");
                break;

            case "cancelled":
            case "canceled":
                subscription.Status = StatusCancelled;
                subscription.CancelledAt = occurredAt;
                subscription.NextBillingAt = null;
                break;

            default:
                _logger.LogWarning("Unsupported subscription webhook event: {Event}", webhookEvent.Event);
                return false;
        }

        await _repository.UpdateAsync(subscription);
        return true;
    }

    private async Task<Subscription> ProcessBillingAttemptAsync(Subscription subscription, DateTime now, bool manualRetry)
    {
        var result = await RequestChargeAsync(subscription, now, manualRetry);
        if (result.Success)
        {
            ApplyBillingSuccess(subscription, now, result.TransactionId);
        }
        else
        {
            ApplyBillingFailure(subscription, now, result.ErrorMessage ?? "billing_failed");
        }

        await _repository.UpdateAsync(subscription);
        return subscription;
    }

    private void ApplyBillingSuccess(Subscription subscription, DateTime billedAtUtc, string? transactionId)
    {
        var interval = ResolvePlanInterval(subscription.Plan);
        var nextBilling = AddBillingPeriod(billedAtUtc, interval);

        subscription.Status = StatusActive;
        subscription.LastBilledAt = billedAtUtc;
        subscription.NextBillingAt = nextBilling;
        subscription.CurrentPeriodStartAt = billedAtUtc;
        subscription.CurrentPeriodEndAt = nextBilling;
        subscription.BillingRetryCount = 0;
        subscription.LastBillingError = null;
        subscription.CancelledAt = null;

        if (!string.IsNullOrWhiteSpace(transactionId))
        {
            subscription.LastTransactionId = transactionId;
        }
    }

    private void ApplyBillingFailure(Subscription subscription, DateTime failedAtUtc, string error)
    {
        var maxRetries = Math.Max(1, _configuration.GetValue("Subscriptions:MaxRetryAttempts", 3));
        var retryDelayHours = Math.Max(1, _configuration.GetValue("Subscriptions:RetryDelayHours", 24));

        subscription.BillingRetryCount += 1;
        subscription.LastBillingError = error;

        if (subscription.BillingRetryCount >= maxRetries)
        {
            subscription.Status = StatusCancelled;
            subscription.CancelledAt = failedAtUtc;
            subscription.NextBillingAt = null;

            _logger.LogWarning(
                "Subscription cancelled after max retries. subscriptionId={SubscriptionId} retries={Retries} error={Error}",
                subscription.Id,
                subscription.BillingRetryCount,
                error);
            return;
        }

        subscription.Status = StatusPastDue;
        subscription.NextBillingAt = failedAtUtc.AddHours(retryDelayHours);

        _logger.LogWarning(
            "Subscription billing failed. subscriptionId={SubscriptionId} retry={Retry}/{MaxRetries} nextBillingAt={NextBillingAt} error={Error}",
            subscription.Id,
            subscription.BillingRetryCount,
            maxRetries,
            subscription.NextBillingAt,
            error);
    }

    private async Task<BillingChargeResult> RequestChargeAsync(Subscription subscription, DateTime now, bool manualRetry)
    {
        if (!TryResolvePlan(subscription.Plan, out var plan))
        {
            return BillingChargeResult.Fail("unknown_plan");
        }

        var baseUrl = _configuration["Subscriptions:Billing:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return BillingChargeResult.Fail("billing_provider_not_configured");
        }

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri))
        {
            return BillingChargeResult.Fail("billing_provider_invalid_base_url");
        }

        var chargePath = _configuration["Subscriptions:Billing:ChargePath"];
        if (string.IsNullOrWhiteSpace(chargePath))
        {
            chargePath = "/charges";
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = baseUri;

            var apiKey = _configuration["Subscriptions:Billing:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }

            var currency = _configuration["Subscriptions:Billing:Currency"] ?? "BRL";
            var idempotencyKey = $"subscription:{subscription.Id}:{subscription.NextBillingAt:O}:{subscription.BillingRetryCount + 1}";
            var payload = new
            {
                subscriptionId = subscription.Id,
                plan = plan.Id,
                email = subscription.Email,
                amount = plan.Price,
                currency,
                manualRetry,
                periodStartAt = subscription.CurrentPeriodStartAt,
                periodEndAt = subscription.CurrentPeriodEndAt,
                attempt = subscription.BillingRetryCount + 1,
                idempotencyKey
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync(chargePath, content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return BillingChargeResult.Fail($"provider_http_{(int)response.StatusCode}");
            }

            if (string.IsNullOrWhiteSpace(body))
            {
                return BillingChargeResult.Ok(null);
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var success = !root.TryGetProperty("success", out var successProp)
                || successProp.ValueKind != JsonValueKind.False;
            var transactionId = root.TryGetProperty("transactionId", out var tx)
                ? tx.GetString()
                : (root.TryGetProperty("id", out var idProp) ? idProp.GetString() : null);
            var error = root.TryGetProperty("error", out var errorProp)
                ? errorProp.GetString()
                : (root.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : null);

            return success
                ? BillingChargeResult.Ok(transactionId)
                : BillingChargeResult.Fail(error ?? "provider_rejected_charge");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Subscription charge request failed. subscriptionId={SubscriptionId}", subscription.Id);
            return BillingChargeResult.Fail("provider_exception");
        }
    }

    private bool TryResolvePlan(string plan, out BillingPlanConfig resolvedPlan)
    {
        var plans = _configuration.GetSection("Subscriptions:Plans").Get<List<BillingPlanConfig>>() ?? new List<BillingPlanConfig>();
        resolvedPlan = plans.FirstOrDefault(p =>
            string.Equals(p.Id, plan, StringComparison.OrdinalIgnoreCase)
            || string.Equals(p.Name, plan, StringComparison.OrdinalIgnoreCase))
            ?? new BillingPlanConfig();

        return !string.IsNullOrWhiteSpace(resolvedPlan.Id) && resolvedPlan.Price >= 0;
    }

    private string ResolvePlanInterval(string plan)
    {
        return TryResolvePlan(plan, out var resolvedPlan) && !string.IsNullOrWhiteSpace(resolvedPlan.Interval)
            ? resolvedPlan.Interval
            : "month";
    }

    private static DateTime AddBillingPeriod(DateTime fromUtc, string interval)
    {
        return interval.Trim().ToLowerInvariant() switch
        {
            "year" => fromUtc.AddYears(1),
            "week" => fromUtc.AddDays(7),
            _ => fromUtc.AddMonths(1)
        };
    }

    public record BillingRunResult(int Processed, int Succeeded, int Failed);
    public record SubscriptionWebhookEvent(Guid SubscriptionId, string Event, string? TransactionId, string? Error, DateTime? OccurredAt);

    private sealed class BillingPlanConfig
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Interval { get; set; } = "month";
    }

    private sealed class BillingChargeResult
    {
        public bool Success { get; private init; }
        public string? TransactionId { get; private init; }
        public string? ErrorMessage { get; private init; }

        public static BillingChargeResult Ok(string? transactionId)
            => new() { Success = true, TransactionId = transactionId };

        public static BillingChargeResult Fail(string errorMessage)
            => new() { Success = false, ErrorMessage = errorMessage };
    }
}
