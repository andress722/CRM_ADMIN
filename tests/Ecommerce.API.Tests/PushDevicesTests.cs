using Xunit;
using System.Net;
using System.Net.Http.Json;

namespace Ecommerce.API.Tests;

public class PushDevicesTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public PushDevicesTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_WithUnsupportedPlatform_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/v1/push/devices", new
        {
            token = "device-token-1",
            platform = "blackberry",
            deviceName = "Legacy phone"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SendTestPush_WithRegisteredDevice_ReturnsDispatchSummary()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);

        var registerResponse = await client.PostAsJsonAsync("/api/v1/push/devices", new
        {
            token = "ExponentPushToken[test-device-1]",
            platform = "expo",
            deviceName = "QA device"
        });
        registerResponse.EnsureSuccessStatusCode();

        var response = await client.PostAsJsonAsync("/api/v1/push/devices/test", new
        {
            title = "Order ready",
            body = "Tap to view order details",
            deepLink = "ecommerce://orders/123",
            data = new Dictionary<string, string>
            {
                ["orderId"] = "123"
            }
        });

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<PushDispatchResponse>();

        Assert.NotNull(payload);
        Assert.Equal(1, payload.Attempted);
        Assert.Equal(1, payload.Succeeded);
        Assert.Equal(0, payload.Failed);
        Assert.Equal("log", payload.Provider);
        Assert.Equal("ecommerce://orders/123", payload.DeepLink);
    }

    [Fact]
    public async Task SendTestPush_WithDisallowedDeepLink_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);

        var registerResponse = await client.PostAsJsonAsync("/api/v1/push/devices", new
        {
            token = "ExponentPushToken[test-device-2]",
            platform = "expo",
            deviceName = "QA device"
        });
        registerResponse.EnsureSuccessStatusCode();

        var response = await client.PostAsJsonAsync("/api/v1/push/devices/test", new
        {
            title = "Unsafe link",
            body = "Should be rejected",
            deepLink = "https://malicious.example/phish"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed record PushDispatchResponse(
        int Attempted,
        int Succeeded,
        int Failed,
        string Provider,
        string? DeepLink,
        string? Error);
}

