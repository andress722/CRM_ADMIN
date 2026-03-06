using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Ecommerce.API.Tests;

public class AdminExtrasPersistenceTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public AdminExtrasPersistenceTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Admin_Extras_Persistence_Flows_Work()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);

        var settingsUpdate = await client.PutAsJsonAsync("/api/v1/admin/settings", new
        {
            storeName = "Minha Loja",
            contactEmail = "ops@minhaloja.com",
            maintenance = true,
            defaultDarkMode = false
        });
        Assert.Equal(HttpStatusCode.OK, settingsUpdate.StatusCode);

        var settings = await client.GetFromJsonAsync<JsonElement>("/api/v1/admin/settings");
        Assert.Equal("Minha Loja", settings.GetProperty("storeName").GetString());
        Assert.Equal("ops@minhaloja.com", settings.GetProperty("contactEmail").GetString());
        Assert.True(settings.GetProperty("maintenance").GetBoolean());

        var profileUpdate = await client.PutAsJsonAsync("/api/v1/admin/profile", new
        {
            name = "Admin QA",
            email = "admin-qa@example.com",
            avatar = "/avatars/admin.png",
            preferences = new { darkMode = false, notifications = true }
        });
        Assert.Equal(HttpStatusCode.OK, profileUpdate.StatusCode);

        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/admin/profile");
        Assert.Equal("Admin QA", profile.GetProperty("name").GetString());
        Assert.Equal("admin-qa@example.com", profile.GetProperty("email").GetString());

        var integrationCreate = await client.PostAsJsonAsync("/api/v1/admin/integrations", new
        {
            id = "",
            name = "ERP Bridge",
            provider = "ERP",
            status = "active",
            apiKey = "secret-123",
            type = "sync"
        });
        Assert.Equal(HttpStatusCode.OK, integrationCreate.StatusCode);

        var integrations = await client.GetFromJsonAsync<JsonElement>("/api/v1/admin/integrations");
        Assert.True(integrations.ValueKind == JsonValueKind.Array);
        Assert.Contains(integrations.EnumerateArray(), x => x.GetProperty("name").GetString() == "ERP Bridge");

        var invite = await client.PostAsJsonAsync("/api/v1/admin/admins/invite", new
        {
            email = "new-admin@example.com",
            role = "Admin"
        });
        Assert.Equal(HttpStatusCode.OK, invite.StatusCode);

        var admins = await client.GetFromJsonAsync<JsonElement>("/api/v1/admin/admins");
        Assert.True(admins.ValueKind == JsonValueKind.Array);
        Assert.Contains(admins.EnumerateArray(), x => x.GetProperty("email").GetString() == "new-admin@example.com");
    }
}
