using System.Net.Http.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class AdminCheckoutHealthTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public AdminCheckoutHealthTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetCheckoutHealth_ReturnsAntiAbuseSummary()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var response = await client.GetAsync("/api/v1/admin/debug/checkout-health");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<CheckoutHealthResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.AntiAbuse);
        Assert.True(payload.AntiAbuse.RateLimitRulesVersioned);
        Assert.Contains(payload.AntiAbuse.RouteClasses, x => x.Key == "auth" && x.CoupledAlerts.Contains("EcommerceApiAuth429Spike"));
        Assert.Contains(payload.AntiAbuse.RouteClasses, x => x.Key == "checkout" && x.CoupledAlerts.Contains("EcommerceApiCheckout429Spike"));
        Assert.Contains(payload.AntiAbuse.RouteClasses, x => x.Key == "webhook" && x.CoupledAlerts.Contains("EcommerceApiWebhook429Spike"));
        Assert.Contains("EcommerceApiHighP95Latency", payload.AntiAbuse.Alerts);
    }

    private sealed record CheckoutHealthResponse(AntiAbuseResponse AntiAbuse);
    private sealed record AntiAbuseResponse(List<RouteClassResponse> RouteClasses, List<string> Alerts, bool RateLimitRulesVersioned);
    private sealed record RouteClassResponse(string Key, List<string> CoupledAlerts);
}
