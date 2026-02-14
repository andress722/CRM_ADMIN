using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class ValidationTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public ValidationTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Checkout_InvalidOrderId_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/payments/checkout", new
        {
            orderId = Guid.Empty,
            payerEmail = "user@example.com"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_InvalidEmail_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/payments/checkout", new
        {
            orderId = Guid.NewGuid(),
            payerEmail = "not-an-email"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Refund_InvalidAmount_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/v1/refunds", new
        {
            orderId = Guid.NewGuid(),
            amount = 0,
            reason = "Test"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Refund_MissingReason_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/v1/refunds", new
        {
            orderId = Guid.NewGuid(),
            amount = 10,
            reason = ""
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
