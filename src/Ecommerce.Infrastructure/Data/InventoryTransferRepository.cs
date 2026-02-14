using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class InventoryTransferRepository : IInventoryTransferRepository
{
    private readonly EcommerceDbContext _context;

    public InventoryTransferRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(InventoryTransfer transfer)
    {
        await _context.InventoryTransfers.AddAsync(transfer);
        await _context.SaveChangesAsync();
    }
}
