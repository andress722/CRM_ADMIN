using System.Linq;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Ecommerce.Infrastructure.Data;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Tests;

public class EventStoreTests
{
    [Fact]
    public async Task AddingOrder_PublishesPurchaseCompletedEvent()
    {
        var options = new DbContextOptionsBuilder<EcommerceDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_EventStore")
            .Options;

        await using var context = new EcommerceDbContext(options);

        // ensure DB created
        await context.Database.EnsureCreatedAsync();

        var repo = new OrderRepository(context);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            TotalAmount = 42.5m,
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>
            {
                new OrderItem { Id = Guid.NewGuid(), OrderId = Guid.NewGuid(), ProductId = Guid.NewGuid(), Quantity = 1, UnitPrice = 42.5m, Subtotal = 42.5m }
            }
        };

        await repo.AddAsync(order);

        var ev = context.EventStore.FirstOrDefault();
        Assert.NotNull(ev);
        Assert.Equal("PurchaseCompleted", ev.EventType);
        Assert.Contains(order.Id.ToString(), ev.Payload);
    }
}
