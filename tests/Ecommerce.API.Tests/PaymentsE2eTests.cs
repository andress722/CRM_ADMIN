using System.Net;
using System.Net.Http.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class PaymentsE2eTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public PaymentsE2eTests(CustomWebAppFactory factory)
        => _factory = factory;

    [Fact]
    public async Task TransparentCheckout_Pix_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var orderId = await SeedOrderAsync(99.9m);

        var response = await client.PostAsJsonAsync("/api/v1/payments/transparent", new
        {
            orderId,
            method = "pix",
            amount = 99.9m,
            paymentMethodId = "pix",
            description = $"Pedido {orderId}",
            payer = BuildPayer(),
            card = (object?)null
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<TransparentPaymentResponse>();
        Assert.NotNull(payload);
        Assert.Equal("Captured", payload!.status);
        Assert.Equal("approved", payload.gatewayStatus);
        Assert.Equal("Pagamento aprovado.", payload.statusMessage);
        Assert.False(string.IsNullOrWhiteSpace(payload.pixQrCodeBase64));
    }

    [Fact]
    public async Task TransparentCheckout_Boleto_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var orderId = await SeedOrderAsync(49.9m);

        var response = await client.PostAsJsonAsync("/api/v1/payments/transparent", new
        {
            orderId,
            method = "boleto",
            amount = 49.9m,
            paymentMethodId = "bolbradesco",
            description = $"Pedido {orderId}",
            payer = BuildPayer(),
            card = (object?)null
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<TransparentPaymentResponse>();
        Assert.NotNull(payload);
        Assert.Equal("Captured", payload!.status);
        Assert.Equal("approved", payload.gatewayStatus);
        Assert.Equal("Pagamento aprovado.", payload.statusMessage);
        Assert.False(string.IsNullOrWhiteSpace(payload.boletoUrl));
    }

    [Fact]
    public async Task TransparentCheckout_Card_Works()
    {
        var client = await TestAuthHelper.CreateAdminClientAsync(_factory);
        var orderId = await SeedOrderAsync(159.9m);

        var response = await client.PostAsJsonAsync("/api/v1/payments/transparent", new
        {
            orderId,
            method = "card",
            amount = 159.9m,
            paymentMethodId = "visa",
            description = $"Pedido {orderId}",
            payer = BuildPayer(),
            card = new
            {
                token = "fake_token",
                installments = 3,
                paymentMethodId = "visa",
                issuerId = "123"
            }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<TransparentPaymentResponse>();
        Assert.NotNull(payload);
        Assert.Equal("Captured", payload!.status);
        Assert.Equal("approved", payload.gatewayStatus);
        Assert.Equal("Pagamento aprovado.", payload.statusMessage);
    }

    private async Task<Guid> SeedOrderAsync(decimal total)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"user{Guid.NewGuid():N}@example.com",
            FullName = "Test User",
            PasswordHash = string.Empty,
            IsEmailVerified = true,
            Role = "User",
            CreatedAt = DateTime.UtcNow
        };

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Status = OrderStatus.Pending,
            TotalAmount = total,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        return order.Id;
    }

    private static object BuildPayer() => new
    {
        email = "buyer@example.com",
        firstName = "Joao",
        lastName = "Silva",
        identificationType = "CPF",
        identificationNumber = "529.982.247-25",
        phoneAreaCode = "11",
        phoneNumber = "999999999"
    };

    private record TransparentPaymentResponse(
        Guid paymentId,
        string status,
        string gatewayStatus,
        string? gatewayStatusDetail,
        string? statusMessage,
        string transactionId,
        string? pixQrCode,
        string? pixQrCodeBase64,
        string? boletoUrl
    );
}
