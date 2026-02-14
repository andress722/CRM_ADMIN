using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IInventoryMovementRepository
{
    Task AddAsync(InventoryMovement movement);
    Task<IEnumerable<InventoryMovement>> GetByProductIdAsync(Guid productId);
}
