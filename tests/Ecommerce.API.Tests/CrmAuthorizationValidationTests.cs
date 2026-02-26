using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class CrmAuthorizationValidationTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public CrmAuthorizationValidationTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Crm_CreateLead_WithoutAuth_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/admin/crm/leads", new
        {
            name = "Lead One",
            email = "lead@example.com",
            company = "Acme",
            value = 1000,
            owner = "Owner",
            source = "Web"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Crm_CreateLead_AsRegularUser_ReturnsForbidden()
    {
        var client = await TestAuthHelper.CreateUserClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/v1/admin/crm/leads", new
        {
            name = "Lead One",
            email = "lead@example.com",
            company = "Acme",
            value = 1000,
            owner = "Owner",
            source = "Web"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Crm_CreateLead_InvalidPayload_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/v1/admin/crm/leads", new
        {
            name = "A",
            email = "invalid-email",
            company = "",
            value = -10,
            owner = "",
            source = ""
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Crm_CreateDeal_InvalidProbability_ReturnsBadRequest()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/v1/admin/crm/deals", new
        {
            title = "Deal X",
            company = "Acme",
            owner = "Owner",
            value = 100,
            probability = 120
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
