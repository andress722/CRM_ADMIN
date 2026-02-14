using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class InventoryMovementRepository : IInventoryMovementRepository
{
    private readonly EcommerceDbContext _context;

    public InventoryMovementRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(InventoryMovement movement)
    {
        await _context.InventoryMovements.AddAsync(movement);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<InventoryMovement>> GetByProductIdAsync(Guid productId)
        => await _context.InventoryMovements
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
}
