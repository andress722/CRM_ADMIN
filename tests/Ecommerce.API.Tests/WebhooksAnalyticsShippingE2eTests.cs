using System.Net;
using System.Net.Http.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class WebhooksAnalyticsShippingE2eTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public WebhooksAnalyticsShippingE2eTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Webhook_Create_And_Publish_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var createResponse = await client.PostAsJsonAsync("/api/v1/webhooks", new
        {
            url = "https://example.com/webhook",
            events = new[] { "OrderCreated" }
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        var publishResponse = await client.PostAsJsonAsync("/api/v1/webhooks/publish", new
        {
            eventType = "OrderCreated",
            payload = "{\"orderId\":\"123\"}"
        });

        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var deliveries = scope.ServiceProvider.GetRequiredService<IWebhookDeliveryRepository>();
        var pending = await deliveries.GetPendingAsync(DateTime.UtcNow, 10);
        Assert.NotEmpty(pending);
    }

    [Fact]
    public async Task Analytics_Track_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/v1/analytics/events", new
        {
            userId = Guid.NewGuid(),
            type = "Login",
            category = "Auth",
            action = "Login",
            label = "Test",
            value = 1,
            url = "https://example.com/login"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Analytics_Aggregation_Writes_Kpi()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var now = DateTime.UtcNow;

        await client.PostAsJsonAsync("/api/v1/analytics/events", new
        {
            userId = Guid.NewGuid(),
            type = "Signup",
            category = "Auth",
            action = "Signup",
            label = "Test",
            value = 1,
            url = "https://example.com/signup"
        });

        await client.PostAsJsonAsync("/api/v1/analytics/events", new
        {
            userId = Guid.NewGuid(),
            type = "Purchase",
            category = "Orders",
            action = "Purchase",
            label = "Test",
            value = 99.9,
            url = "https://example.com/order"
        });

        using var scope = _factory.Services.CreateScope();
        var analytics = scope.ServiceProvider.GetRequiredService<AnalyticsService>();
        var kpis = scope.ServiceProvider.GetRequiredService<IDailyKpiRepository>();
        var date = DateOnly.FromDateTime(now.Date);

        await analytics.AggregateAsync(date);
        var kpi = await kpis.GetByDateAsync(date);

        Assert.NotNull(kpi);
        Assert.True(kpi!.TotalEvents >= 2);
        Assert.True(kpi.Signups >= 1);
        Assert.True(kpi.Purchases >= 1);
    }

    [Fact]
    public async Task Shipping_Quotes_Track_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var quotesResponse = await client.GetAsync("/api/v1/shipping/quotes?zipCode=01000-000");
        Assert.Equal(HttpStatusCode.OK, quotesResponse.StatusCode);

        var createResponse = await client.PostAsJsonAsync("/api/v1/shipping/shipments", new
        {
            orderId = Guid.NewGuid(),
            provider = "Correios",
            service = "PAC",
            address = "Rua Teste, 123"
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
    }
}
