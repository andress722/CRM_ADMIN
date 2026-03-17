using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ecommerce.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Ecommerce.API.Tests;

public class SubscriptionBillingRunTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public SubscriptionBillingRunTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RunDueBilling_WithSuccessfulProvider_ActivatesSubscriptionAndStoresTransaction()
    {
        using var factory = CreateFactory(new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { success = true, transactionId = "tx-sub-success-1" })
            }));

        var subscriptionId = await SeedDueSubscriptionAsync(factory, billingRetryCount: 1, status: "PastDue");
        var client = await CreateAdminClientAsync(factory);

        var response = await client.PostAsync("/api/v1/subscriptions/billing/run?batchSize=10", null);
        response.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var subscription = await db.Subscriptions.FirstAsync(x => x.Id == subscriptionId);

        Assert.Equal("Active", subscription.Status);
        Assert.Equal(0, subscription.BillingRetryCount);
        Assert.Equal("tx-sub-success-1", subscription.LastTransactionId);
        Assert.NotNull(subscription.NextBillingAt);
    }

    [Fact]
    public async Task RunDueBilling_WithFailedProvider_MarksSubscriptionPastDue()
    {
        using var factory = CreateFactory(new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { success = false, error = "provider_declined" })
            }));

        var subscriptionId = await SeedDueSubscriptionAsync(factory, billingRetryCount: 0, status: "Active");
        var client = await CreateAdminClientAsync(factory);

        var response = await client.PostAsync("/api/v1/subscriptions/billing/run?batchSize=10", null);
        response.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var subscription = await db.Subscriptions.FirstAsync(x => x.Id == subscriptionId);

        Assert.Equal("PastDue", subscription.Status);
        Assert.Equal(1, subscription.BillingRetryCount);
        Assert.Equal("provider_declined", subscription.LastBillingError);
        Assert.NotNull(subscription.NextBillingAt);
    }

    private WebApplicationFactory<Program> CreateFactory(HttpMessageHandler handler)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Subscriptions:Billing:BaseUrl"] = "https://billing.example",
                    ["Subscriptions:Billing:ChargePath"] = "/charges",
                    ["Subscriptions:Billing:ApiKey"] = "test-key",
                    ["Subscriptions:Plans:0:Id"] = "starter",
                    ["Subscriptions:Plans:0:Name"] = "Starter",
                    ["Subscriptions:Plans:0:Price"] = "19.90",
                    ["Subscriptions:Plans:0:Interval"] = "month"
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll(typeof(IHttpClientFactory));
                services.AddSingleton<IHttpClientFactory>(new StaticHttpClientFactory(new HttpClient(handler)
                {
                    BaseAddress = new Uri("https://billing.example")
                }));
            });
        });
    }

    private static async Task<Guid> SeedDueSubscriptionAsync(WebApplicationFactory<Program> factory, int billingRetryCount, string status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var subscription = new Ecommerce.Domain.Entities.Subscription
        {
            Id = Guid.NewGuid(),
            Plan = "starter",
            Email = $"sub-{Guid.NewGuid():N}@example.com",
            Status = status,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            CurrentPeriodStartAt = DateTime.UtcNow.AddMonths(-1),
            CurrentPeriodEndAt = DateTime.UtcNow.AddMinutes(-5),
            NextBillingAt = DateTime.UtcNow.AddMinutes(-5),
            BillingRetryCount = billingRetryCount,
        };
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync();
        return subscription.Id;
    }

    private static async Task<HttpClient> CreateAdminClientAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        var password = "P@ssw0rd123";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            name = "Admin User"
        });
        registerResponse.EnsureSuccessStatusCode();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            user.IsEmailVerified = true;
            user.Role = "Admin";
            await db.SaveChangesAsync();
        }

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        loginResponse.EnsureSuccessStatusCode();
        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.AccessToken);
        return client;
    }

    private sealed class LoginResponse
    {
        public string AccessToken { get; set; } = string.Empty;
    }

    private sealed class StaticHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public StaticHttpClientFactory(HttpClient client)
        {
            _client = client;
        }

        public HttpClient CreateClient(string name) => _client;
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }
}

