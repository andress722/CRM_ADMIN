using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class WishlistItemRepository : IWishlistItemRepository
{
    private readonly EcommerceDbContext _context;

    public WishlistItemRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(WishlistItem item)
    {
        await _context.WishlistItems.AddAsync(item);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveAsync(Guid id)
    {
        var existing = await _context.WishlistItems.FirstOrDefaultAsync(i => i.Id == id);
        if (existing == null)
        {
            return;
        }

        _context.WishlistItems.Remove(existing);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<WishlistItem>> GetByWishlistIdAsync(Guid wishlistId)
        => await _context.WishlistItems.Where(i => i.WishlistId == wishlistId).ToListAsync();

    public async Task<bool> ExistsAsync(Guid wishlistId, Guid productId)
        => await _context.WishlistItems.AnyAsync(i => i.WishlistId == wishlistId && i.ProductId == productId);
}
