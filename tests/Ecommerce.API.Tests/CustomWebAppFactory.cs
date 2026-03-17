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
    private readonly string _databaseName = $"EcommerceTestDb-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
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
                ["Payments:Provider"] = "Stub",
                ["Payments:MercadoPago:WebhookSecret"] = "test_webhook_secret",
                ["Payments:MercadoPago:WebhookSignatureFormat"] = "ts_requestid_body",
                ["Subscriptions:Billing:WebhookSecret"] = "test_subscriptions_webhook_secret",
                ["Subscriptions:Billing:WebhookSignatureFormat"] = "ts_requestid_body",
                ["Email:Provider"] = "Console",
                ["Security:RequireAdmin2FA"] = "false",
                ["DeploySignals:SharedSecret"] = "test-deploy-signal-secret",
                ["DeploySignals:FreshnessHours"] = "24"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<EcommerceDbContext>));
            services.AddDbContext<EcommerceDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            services.RemoveAll(typeof(IPaymentGateway));
            services.AddScoped<IPaymentGateway, StubPaymentGateway>();
        });
    }
}
