using System.Net;
using System.Net.Http.Json;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class AuthFlowTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public AuthFlowTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Register_Verify_Login_Refresh_Works()
    {
        var client = _factory.CreateClient();
        var email = "user1@example.com";
        var password = "P@ssw0rd123";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            name = "User One"
        });

        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        string? token;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            token = await db.EmailVerificationTokens
                .Where(t => t.User!.Email == email)
                .Select(t => t.Token)
                .FirstOrDefaultAsync();
        }

        Assert.False(string.IsNullOrWhiteSpace(token));

        var verifyResponse = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new
        {
            token
        });

        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginPayload>();
        Assert.False(string.IsNullOrWhiteSpace(loginPayload?.RefreshToken));

        var refreshResponse = await client.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = loginPayload!.RefreshToken
        });

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
    }

    private record LoginPayload(string AccessToken, string RefreshToken);
}
