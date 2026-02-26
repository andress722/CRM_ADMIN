using System.Net;
using Xunit;

namespace Ecommerce.API.Tests;

public class MetricsAccessTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public MetricsAccessTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Metrics_WithoutAuth_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/metrics");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Metrics_AsRegularUser_ReturnsForbidden()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);

        var response = await client.GetAsync("/metrics");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Metrics_AsAdmin_ReturnsPrometheusPayload()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        await client.GetAsync("/health");
        var response = await client.GetAsync("/metrics");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("http_requests_total", body);
        Assert.Contains("http_responses_total", body);
        Assert.Contains("http_request_duration_ms_bucket", body);
    }
}
