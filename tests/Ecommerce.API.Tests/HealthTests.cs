using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Ecommerce.API.Tests;

public class HealthTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public HealthTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Health_Returns_Ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
