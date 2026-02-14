using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class AdminE2eTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public AdminE2eTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Admin_Overview_Returns_Ok()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/v1/admin/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Inventory_Adjust_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var productId = Guid.NewGuid();
        var response = await client.PostAsJsonAsync($"/api/v1/inventory/{productId}/adjust", new
        {
            delta = 5,
            reason = "Test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Crm_Lead_Flow_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var createResponse = await client.PostAsJsonAsync("/api/v1/admin/crm/leads", new
        {
            name = "Lead 1",
            email = "lead@example.com",
            company = "Acme",
            value = 1000,
            owner = "Admin",
            source = "Web",
            status = "New"
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        var listResponse = await client.GetAsync("/api/v1/admin/crm/leads");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
    }

    [Fact]
    public async Task Refund_Flow_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var createResponse = await client.PostAsJsonAsync("/api/v1/refunds", new
        {
            orderId = Guid.NewGuid(),
            amount = 99.9,
            reason = "Test"
        });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        var refund = await createResponse.Content.ReadFromJsonAsync<RefundResponse>();
        Assert.NotNull(refund);

        var approveResponse = await client.PostAsJsonAsync($"/api/v1/refunds/{refund!.Id}/approve", new { });
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);
    }

    private record RefundResponse(Guid Id);
}
