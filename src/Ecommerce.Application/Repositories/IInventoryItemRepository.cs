using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IInventoryItemRepository
{
    Task<InventoryItem?> GetByProductIdAsync(Guid productId);
    Task<IEnumerable<InventoryItem>> GetLowStockAsync();
    Task UpsertAsync(InventoryItem item);
}
