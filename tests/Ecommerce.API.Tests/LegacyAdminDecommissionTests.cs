using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class LegacyAdminDecommissionTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public LegacyAdminDecommissionTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Theory]
    [InlineData("/api/abandoned-carts", "/api/v1/admin/reports")]
    [InlineData("/api/payments", "/api/v1/admin/payments")]
    [InlineData("/api/reviews", "/api/v1/admin/reviews")]
    public async Task Legacy_Endpoints_Return_410_With_Replacement(string route, string replacement)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(route);

        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Legacy endpoint disabled.", payload.GetProperty("message").GetString());
        Assert.Equal(replacement, payload.GetProperty("replacement").GetString());
    }

    [Fact]
    public async Task Replacement_Admin_Endpoints_Are_Accessible_For_Admin()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var replacementRoutes = new[]
        {
            "/api/v1/admin/reports",
            "/api/v1/admin/payments",
            "/api/v1/admin/reviews"
        };

        foreach (var route in replacementRoutes)
        {
            var response = await client.GetAsync(route);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
