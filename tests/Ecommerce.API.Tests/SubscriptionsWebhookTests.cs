using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class SubscriptionsWebhookTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public SubscriptionsWebhookTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task BillingWebhook_InvalidSecret_ReturnsUnauthorized()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);
        var subscriptionId = await CreateSubscriptionAsync(client);

        var response = await PostWebhookAsync(
            client,
            new BillingWebhookPayload(subscriptionId, "billing_succeeded", "tx-unauthorized-1", null, DateTime.UtcNow),
            requestId: "sub-hook-unauthorized",
            legacySecret: "wrong_secret");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task BillingWebhook_ValidHmacSignature_ReturnsOk()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);
        var subscriptionId = await CreateSubscriptionAsync(client);

        var response = await PostWebhookAsync(
            client,
            new BillingWebhookPayload(subscriptionId, "billing_succeeded", "tx-signature-1", null, DateTime.UtcNow),
            requestId: "sub-hook-signature-ok",
            signatureSecret: "test_subscriptions_webhook_secret");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task BillingWebhook_InvalidHmacSignature_ReturnsUnauthorized()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);
        var subscriptionId = await CreateSubscriptionAsync(client);

        var response = await PostWebhookAsync(
            client,
            new BillingWebhookPayload(subscriptionId, "billing_succeeded", "tx-signature-invalid-1", null, DateTime.UtcNow),
            requestId: "sub-hook-signature-invalid",
            signatureSecret: "wrong_secret");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task BillingWebhook_DuplicatePayload_IsIgnored()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);
        var subscriptionId = await CreateSubscriptionAsync(client);
        var payload = new BillingWebhookPayload(subscriptionId, "billing_succeeded", "tx-duplicate-1", null, DateTime.UtcNow);

        var first = await PostWebhookAsync(client, payload, "sub-hook-dup", legacySecret: "test_subscriptions_webhook_secret");
        var second = await PostWebhookAsync(client, payload, "sub-hook-dup", legacySecret: "test_subscriptions_webhook_secret");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var duplicatePayload = await second.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Duplicate webhook ignored", duplicatePayload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task BillingWebhook_SameKeyDifferentPayload_ReturnsConflict()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);
        var subscriptionId = await CreateSubscriptionAsync(client);

        var first = await PostWebhookAsync(
            client,
            new BillingWebhookPayload(subscriptionId, "billing_succeeded", "tx-conflict-1", null, DateTime.UtcNow),
            requestId: "sub-hook-conflict",
            legacySecret: "test_subscriptions_webhook_secret");

        var second = await PostWebhookAsync(
            client,
            new BillingWebhookPayload(subscriptionId, "billing_failed", "tx-conflict-2", "provider_declined", DateTime.UtcNow),
            requestId: "sub-hook-conflict",
            legacySecret: "test_subscriptions_webhook_secret");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    private static async Task<Guid> CreateSubscriptionAsync(HttpClient client)
    {
        var email = $"subscriber-{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/v1/subscriptions", new
        {
            plan = "starter",
            email
        });

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        return payload.GetProperty("id").GetGuid();
    }

    private static async Task<HttpResponseMessage> PostWebhookAsync(
        HttpClient client,
        BillingWebhookPayload payload,
        string requestId,
        string? legacySecret = null,
        string? signatureSecret = null)
    {
        var json = JsonSerializer.Serialize(payload);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/subscriptions/webhooks/billing")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        request.Headers.Add("x-request-id", requestId);

        if (!string.IsNullOrWhiteSpace(legacySecret))
        {
            request.Headers.Add("x-subscription-webhook-secret", legacySecret);
        }

        if (!string.IsNullOrWhiteSpace(signatureSecret))
        {
            var ts = "1";
            var signature = ComputeSignature(signatureSecret, $"{ts}.{requestId}.{json}");
            request.Headers.Add("x-signature", $"ts={ts},v1={signature}");
        }

        return await client.SendAsync(request);
    }

    private static string ComputeSignature(string secret, string payload)
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

    private record BillingWebhookPayload(
        Guid SubscriptionId,
        string Event,
        string? TransactionId,
        string? Error,
        DateTime? OccurredAt);
}
