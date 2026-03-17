using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ecommerce.API.Tests;

public class StorefrontJourneyTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;

    public StorefrontJourneyTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CatalogToCartToCheckoutToWebhook_Works()
    {
        var userClient = await TestAuthHelper.CreateUserClientAsync(_factory);
        var productId = await SeedProductAsync();

        var searchResponse = await userClient.GetAsync("/api/v1/products/search?query=Journey&page=1&pageSize=10");
        searchResponse.EnsureSuccessStatusCode();
        var searchPayload = await searchResponse.Content.ReadFromJsonAsync<ProductSearchResponse>();
        Assert.NotNull(searchPayload);
        Assert.Contains(searchPayload!.Items, item => item.Id == productId);

        var addCartResponse = await userClient.PostAsJsonAsync("/api/v1/cart/items", new
        {
            productId,
            quantity = 2
        });
        Assert.Equal(HttpStatusCode.Created, addCartResponse.StatusCode);

        var cartResponse = await userClient.GetAsync("/api/v1/cart");
        cartResponse.EnsureSuccessStatusCode();
        var cartItems = await cartResponse.Content.ReadFromJsonAsync<List<CartItemResponse>>();
        Assert.NotNull(cartItems);
        Assert.Contains(cartItems!, item => item.ProductId == productId && item.Quantity == 2);

        var orderResponse = await userClient.PostAsJsonAsync("/api/v1/orders/from-cart", new { });
        Assert.Equal(HttpStatusCode.Created, orderResponse.StatusCode);
        var orderPayload = await orderResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(orderPayload);
        Assert.NotEqual(Guid.Empty, orderPayload!.Id);

        var checkoutResponse = await userClient.PostAsJsonAsync("/api/v1/payments/checkout", new
        {
            orderId = orderPayload.Id,
            payerEmail = "buyer@example.com"
        });
        checkoutResponse.EnsureSuccessStatusCode();
        var checkoutPayload = await checkoutResponse.Content.ReadFromJsonAsync<CheckoutResponse>();
        Assert.NotNull(checkoutPayload);
        Assert.False(string.IsNullOrWhiteSpace(checkoutPayload!.PreferenceId));

        var webhookBody = $"{{\"data\":{{\"id\":\"{checkoutPayload.PreferenceId}\"}}}}";
        var ts = "1";
        var requestId = "journey-webhook-1";
        var signature = ComputeSignature("test_webhook_secret", $"{ts}.{requestId}.{webhookBody}");
        using var webhookRequest = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/mercadopago?type=payment")
        {
            Content = new StringContent(webhookBody, Encoding.UTF8, "application/json")
        };
        webhookRequest.Headers.Add("x-request-id", requestId);
        webhookRequest.Headers.Add("x-signature", $"ts={ts},v1={signature}");

        var webhookResponse = await _factory.CreateClient().SendAsync(webhookRequest);
        Assert.Equal(HttpStatusCode.OK, webhookResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var order = await db.Orders.FirstAsync(x => x.Id == orderPayload.Id);
        var payment = await db.Payments.FirstAsync(x => x.OrderId == orderPayload.Id);

        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(PaymentStatus.Captured, payment.Status);
        Assert.Equal(checkoutPayload.PreferenceId, payment.TransactionId);
    }

    private async Task<Guid> SeedProductAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = "Journey GPU",
            Description = "Product used for storefront journey testing",
            Price = 2499.90m,
            Stock = 10,
            Category = "Hardware",
            Sku = $"JOURNEY-{Guid.NewGuid():N}"[..16],
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product.Id;
    }

    private static string ComputeSignature(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    private sealed record ProductSearchResponse(List<ProductResponse> Items, int Total);
    private sealed record ProductResponse(Guid Id, string Name);
    private sealed record CartItemResponse(Guid Id, Guid ProductId, int Quantity);
    private sealed record OrderResponse(Guid Id, decimal TotalAmount);
    private sealed record CheckoutResponse(Guid PaymentId, string PreferenceId, string InitPoint, string? SandboxInitPoint);
}
