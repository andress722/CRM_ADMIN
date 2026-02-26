using System.Net;
using Xunit;

namespace Ecommerce.API.Tests;

public class RecommendationsAccessTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public RecommendationsAccessTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Recommendations_Endpoint_Is_Public()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/recommendations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
