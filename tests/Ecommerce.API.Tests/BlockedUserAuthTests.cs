using System.Net;
using System.Net.Http.Json;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class BlockedUserAuthTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public BlockedUserAuthTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task Blocked_User_Cannot_Login()
    {
        var client = _factory.CreateClient();
        var email = $"blocked-{Guid.NewGuid():N}@example.com";
        var password = "P@ssw0rd123";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            name = "Blocked User"
        });

        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            user.IsEmailVerified = true;
            user.IsBlocked = true;
            await db.SaveChangesAsync();
        }

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password
        });

        Assert.Equal(HttpStatusCode.Forbidden, loginResponse.StatusCode);
    }
}
