using System.Net;
using System.Security.Cryptography;
using System.Text;
using Xunit;

namespace Ecommerce.API.Tests;

public class PaymentsWebhookTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;

    public PaymentsWebhookTests(CustomWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Webhook_InvalidSignature_ReturnsUnauthorized()
    {
        var body = "{\"data\":{\"id\":\"123\"}}";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/mercadopago");
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");
        request.Headers.Add("x-request-id", "req-1");
        request.Headers.Add("x-signature", "ts=1,v1=invalid");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Webhook_ValidSignature_WithUnknownPayment_ReturnsNotFound()
    {
        var body = "{\"data\":{\"id\":\"123\"}}";
        var ts = "1";
        var requestId = "req-2";
        var signature = ComputeSignature("test_webhook_secret", $"{ts}.{requestId}.{body}");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/mercadopago");
        request.Content = new StringContent(body, Encoding.UTF8, "application/json");
        request.Headers.Add("x-request-id", requestId);
        request.Headers.Add("x-signature", $"ts={ts},v1={signature}");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
}
