using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class ProductSearchTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public ProductSearchTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SearchProducts_ReturnsEngineFacetsAndSuggestions()
    {
        var admin = await TestAuthHelper.CreateAdminClientAsync(_factory);

        await admin.PostAsJsonAsync("/api/v1/products", new
        {
            name = "RTX Search Beast",
            description = "GPU for search engine testing",
            price = 1999.99m,
            stock = 5,
            category = "GPU",
            sku = $"GPU-{Guid.NewGuid():N}",
            isFeatured = true,
        });

        await admin.PostAsJsonAsync("/api/v1/products", new
        {
            name = "RTX Search Budget",
            description = "Budget GPU for filtering",
            price = 899.99m,
            stock = 3,
            category = "GPU",
            sku = $"GPU-{Guid.NewGuid():N}",
            isFeatured = false,
        });

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/products/search?query=RTX&category=GPU&page=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("database", payload.GetProperty("engine").GetString());
        Assert.True(payload.GetProperty("total").GetInt32() >= 2);
        Assert.True(payload.GetProperty("facets").EnumerateArray().Any());
        Assert.True(payload.GetProperty("suggestions").EnumerateArray().Any());
    }
}
