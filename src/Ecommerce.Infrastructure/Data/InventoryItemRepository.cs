using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class InventoryItemRepository : IInventoryItemRepository
{
    private readonly EcommerceDbContext _context;

    public InventoryItemRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<InventoryItem?> GetByProductIdAsync(Guid productId)
        => await _context.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == productId);

    public async Task<IEnumerable<InventoryItem>> GetLowStockAsync()
        => await _context.InventoryItems
            .Where(i => i.Quantity <= i.ReorderLevel)
            .OrderBy(i => i.Quantity)
            .ToListAsync();

    public async Task UpsertAsync(InventoryItem item)
    {
        var existing = await GetByProductIdAsync(item.ProductId);
        if (existing == null)
        {
            await _context.InventoryItems.AddAsync(item);
        }
        else
        {
            existing.Quantity = item.Quantity;
            existing.ReorderLevel = item.ReorderLevel;
            existing.UpdatedAt = item.UpdatedAt;
        }

        await _context.SaveChangesAsync();
    }
}
