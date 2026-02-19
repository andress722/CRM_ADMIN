using Ecommerce.Application.Services;
using Ecommerce.Infrastructure.Data;
using Ecommerce.Infrastructure.Payments;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ecommerce.API.Tests;

public class CustomWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:UseInMemory"] = "true",
                ["Jwt:SecretKey"] = "TEST_ONLY_SUPER_SECRET_KEY_123456789",
                ["Jwt:Issuer"] = "ecommerce-api",
                ["Jwt:Audience"] = "ecommerce-admin",
                ["Auth:EmailVerificationMinutes"] = "60",
                ["Auth:PasswordResetMinutes"] = "30",
                ["Auth:MaxFailedAttempts"] = "5",
                ["Auth:LockoutMinutes"] = "15",
                ["Auth:AllowInsecureCookiesInDevelopment"] = "true",
                ["Networking:TrustedProxies:0"] = "127.0.0.1",
                ["Networking:TrustedProxies:1"] = "::1",
                ["Payments:Provider"] = "Stub",
                ["Payments:MercadoPago:WebhookSecret"] = "test_webhook_secret",
                ["Payments:MercadoPago:WebhookSignatureFormat"] = "ts_requestid_body",
                ["Email:Provider"] = "Console"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<EcommerceDbContext>));
            services.AddDbContext<EcommerceDbContext>(options =>
            {
                options.UseInMemoryDatabase("EcommerceTestDb");
            });

            services.RemoveAll(typeof(IPaymentGateway));
            services.AddScoped<IPaymentGateway, StubPaymentGateway>();
        });
    }
}
