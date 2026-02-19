using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
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
        var loginResponse = await RegisterVerifyAndLoginAsync(client, email, password);

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginPayload>();
        Assert.False(string.IsNullOrWhiteSpace(loginPayload?.AccessToken));
        Assert.True(loginResponse.Headers.TryGetValues("Set-Cookie", out var setCookieValues));
        Assert.Contains(setCookieValues!, v => v.Contains("refresh_token="));
        var csrfToken = ExtractCookieValue(setCookieValues!, "csrf_token");
        Assert.False(string.IsNullOrWhiteSpace(csrfToken));

        using var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshRequest.Headers.Add("X-CSRF-Token", csrfToken);
        var refreshResponse = await client.SendAsync(refreshRequest);

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        var refreshPayload = await refreshResponse.Content.ReadFromJsonAsync<LoginPayload>();
        Assert.False(string.IsNullOrWhiteSpace(refreshPayload?.AccessToken));
    }

    [Fact]
    public async Task Refresh_WithoutCsrfHeader_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var email = "csrf-user@example.com";
        var password = "P@ssw0rd123";
        var loginResponse = await RegisterVerifyAndLoginAsync(client, email, password);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var refreshResponse = await client.PostAsync("/api/v1/auth/refresh", content: null);
        Assert.Equal(HttpStatusCode.Forbidden, refreshResponse.StatusCode);
    }

    [Fact]
    public async Task Logout_RequiresCsrfHeader()
    {
        var client = _factory.CreateClient();
        var email = "logout-csrf@example.com";
        var password = "P@ssw0rd123";
        var loginResponse = await RegisterVerifyAndLoginAsync(client, email, password);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        Assert.True(loginResponse.Headers.TryGetValues("Set-Cookie", out var setCookieValues));
        var csrfToken = ExtractCookieValue(setCookieValues!, "csrf_token");
        Assert.False(string.IsNullOrWhiteSpace(csrfToken));

        var forbiddenLogout = await client.PostAsync("/api/v1/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenLogout.StatusCode);

        using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/logout");
        logoutRequest.Headers.Add("X-CSRF-Token", csrfToken);
        var okLogout = await client.SendAsync(logoutRequest);
        Assert.Equal(HttpStatusCode.OK, okLogout.StatusCode);
    }

    [Fact]
    public async Task Login_SetsExpectedCookieFlags()
    {
        var client = _factory.CreateClient();
        var response = await RegisterVerifyAndLoginAsync(client, "cookie-flags@example.com", "P@ssw0rd123");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var setCookieValues));

        var refreshCookie = GetCookieHeader(setCookieValues!, "refresh_token");
        var csrfCookie = GetCookieHeader(setCookieValues!, "csrf_token");
        Assert.NotNull(refreshCookie);
        Assert.NotNull(csrfCookie);

        Assert.Contains("HttpOnly", refreshCookie!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("SameSite=Lax", refreshCookie!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Path=/", refreshCookie!, StringComparison.OrdinalIgnoreCase);

        Assert.DoesNotContain("HttpOnly", csrfCookie!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("SameSite=Lax", csrfCookie!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Path=/", csrfCookie!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_WithForwardedProtoHttps_SetsSecureCookies()
    {
        var client = _factory.CreateClient();
        var response = await RegisterVerifyAndLoginAsync(
            client,
            "cookie-secure@example.com",
            "P@ssw0rd123",
            forwardedProto: "https");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var setCookieValues));

        var refreshCookie = GetCookieHeader(setCookieValues!, "refresh_token");
        var csrfCookie = GetCookieHeader(setCookieValues!, "csrf_token");
        Assert.NotNull(refreshCookie);
        Assert.NotNull(csrfCookie);
        Assert.Contains("Secure", refreshCookie!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Secure", csrfCookie!, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<HttpResponseMessage> RegisterVerifyAndLoginAsync(
        HttpClient client,
        string email,
        string password,
        string? forwardedProto = null)
    {
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

        var verifyResponse = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new { token });
        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        if (string.IsNullOrWhiteSpace(forwardedProto))
        {
            return await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        }

        using var loginRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login");
        loginRequest.Headers.Add("X-Forwarded-Proto", forwardedProto);
        loginRequest.Content = JsonContent.Create(new { email, password });
        return await client.SendAsync(loginRequest);
    }

    private static string? GetCookieHeader(IEnumerable<string> setCookies, string cookieName)
        => setCookies.FirstOrDefault(v => v.Contains($"{cookieName}=", StringComparison.OrdinalIgnoreCase));

    private static string? ExtractCookieValue(IEnumerable<string> setCookies, string cookieName)
    {
        var pattern = $@"(?:^|,\s*|;\s*){Regex.Escape(cookieName)}=([^;,\s]+)";
        foreach (var raw in setCookies)
        {
            var match = Regex.Match(raw, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return Uri.UnescapeDataString(match.Groups[1].Value);
            }
        }
        return null;
    }

    private record LoginPayload(string AccessToken);
}
