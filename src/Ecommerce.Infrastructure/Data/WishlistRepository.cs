using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class WishlistRepository : IWishlistRepository
{
    private readonly EcommerceDbContext _context;

    public WishlistRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(Wishlist wishlist)
    {
        await _context.Wishlists.AddAsync(wishlist);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Wishlist wishlist)
    {
        _context.Wishlists.Update(wishlist);
        await _context.SaveChangesAsync();
    }

    public async Task<Wishlist?> GetByIdAsync(Guid id)
        => await _context.Wishlists.FirstOrDefaultAsync(w => w.Id == id);

    public async Task<Wishlist?> GetDefaultAsync(Guid userId)
        => await _context.Wishlists.FirstOrDefaultAsync(w => w.UserId == userId && w.Name == "Wishlist");
}
