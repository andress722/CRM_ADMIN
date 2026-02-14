using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class OrderRepository : IOrderRepository
{
    private readonly EcommerceDbContext _context;

    public OrderRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<Order?> GetByIdAsync(Guid id)
        => await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);

    public async Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId)
        => await _context.Orders.Include(o => o.Items).Where(o => o.UserId == userId).ToListAsync();

    public async Task<IEnumerable<Order>> GetAllAsync()
        => await _context.Orders.Include(o => o.Items).ToListAsync();

    public async Task AddAsync(Order order)
    {
        await _context.Orders.AddAsync(order);

        // publish PurchaseCompleted event to event_store
        try
        {
            var payload = new
            {
                PurchaseId = order.Id,
                UserId = order.UserId,
                Amount = order.TotalAmount,
                Items = order.Items.Select(i => new { i.ProductId, i.Quantity, i.UnitPrice, i.Subtotal })
            };
            var ev = new Ecommerce.Domain.Entities.EventStoreItem
            {
                Id = Guid.NewGuid(),
                EventType = "PurchaseCompleted",
                Payload = System.Text.Json.JsonSerializer.Serialize(payload),
                CreatedAt = DateTime.UtcNow,
                Status = "pending"
            };
            await _context.AddAsync(ev);
        }
        catch (Exception)
        {
            // don't fail order creation if event publishing fails; log at caller if needed
        }

        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Order order)
    {
        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var order = await GetByIdAsync(id);
        if (order != null)
        {
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
        }
    }
}
