using System.Net.Http.Headers;
using System.Net.Http.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ecommerce.API.Tests;

public static class TestAuthHelper
{
    public static async Task<HttpClient> CreateAdminClientAsync(CustomWebAppFactory factory)
    {
        var client = factory.CreateClient();
        var email = $"admin{Guid.NewGuid():N}@example.com";
        var password = "P@ssw0rd123";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            name = "Admin User"
        });

        registerResponse.EnsureSuccessStatusCode();

        string? token;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                throw new InvalidOperationException("User not found for test auth");
            }

            user.IsEmailVerified = true;
            user.Role = "Admin";
            await db.SaveChangesAsync();

            token = await db.EmailVerificationTokens
                .Where(t => t.UserId == user.Id)
                .Select(t => t.Token)
                .FirstOrDefaultAsync();
        }

        if (!string.IsNullOrWhiteSpace(token))
        {
            await client.PostAsJsonAsync("/api/v1/auth/verify-email", new { token });
        }

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password
        });

        loginResponse.EnsureSuccessStatusCode();
        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginPayload>();
        if (payload == null || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            throw new InvalidOperationException("Failed to obtain access token");
        }

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload.AccessToken);
        return client;
    }

    private record LoginPayload(string AccessToken);
}
