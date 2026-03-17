using System.Net;
using System.Net.Http.Headers;
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
        Assert.False(string.IsNullOrWhiteSpace(loginPayload?.AccessToken));

        var csrfToken = ExtractCookieValue(loginResponse.Headers, "csrf_token");
        Assert.False(string.IsNullOrWhiteSpace(csrfToken));

        using var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshRequest.Headers.Add("X-CSRF-Token", csrfToken);

        var refreshResponse = await client.SendAsync(refreshRequest);

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
    }

    private static string? ExtractCookieValue(HttpResponseHeaders headers, string cookieName)
    {
        if (!headers.TryGetValues("Set-Cookie", out var values))
        {
            return null;
        }

        var prefix = cookieName + "=";
        foreach (var cookie in values)
        {
            if (!cookie.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var end = cookie.IndexOf(';');
            var value = end >= 0 ? cookie[prefix.Length..end] : cookie[prefix.Length..];
            return Uri.UnescapeDataString(value);
        }

        return null;
    }

    private record LoginPayload(string AccessToken);
}
