using System.Net;
using System.Net.Http.Json;
using Ecommerce.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class MobileAuthTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public MobileAuthTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MobileLogin_AndRefresh_ReturnsRotatingSessionTokens()
    {
        var registerClient = _factory.CreateClient();
        var email = $"mobile-{Guid.NewGuid():N}@example.com";
        var password = "P@ssw0rd123";

        var registerResponse = await registerClient.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            name = "Mobile User"
        });
        registerResponse.EnsureSuccessStatusCode();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var user = db.Users.First(u => u.Email == email);
            user.IsEmailVerified = true;
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/mobile/login", new
        {
            email,
            password
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<MobileSessionResponse>();
        Assert.NotNull(loginPayload);
        Assert.False(string.IsNullOrWhiteSpace(loginPayload!.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(loginPayload.RefreshToken));

        var refreshResponse = await client.PostAsJsonAsync("/api/v1/auth/mobile/refresh", new
        {
            refreshToken = loginPayload.RefreshToken
        });

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        var refreshPayload = await refreshResponse.Content.ReadFromJsonAsync<MobileSessionResponse>();
        Assert.NotNull(refreshPayload);
        Assert.False(string.IsNullOrWhiteSpace(refreshPayload!.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(refreshPayload.RefreshToken));
        Assert.NotEqual(loginPayload.RefreshToken, refreshPayload.RefreshToken);
    }

    [Fact]
    public async Task MobileRefresh_WithMissingToken_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/mobile/refresh", new { refreshToken = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed record MobileSessionResponse(string AccessToken, string RefreshToken, DateTimeOffset RefreshTokenExpiresAt);
}
