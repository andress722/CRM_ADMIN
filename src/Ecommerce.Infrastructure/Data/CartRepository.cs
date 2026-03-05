using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CartRepository : ICartRepository
{
    private readonly EcommerceDbContext _context;

    public CartRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<CartItem?> GetByIdAsync(Guid id)
        => await _context.CartItems.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<IEnumerable<CartItem>> GetAllAsync()
        => await _context.CartItems.ToListAsync();

    public async Task<IEnumerable<CartItem>> GetByUserIdAsync(Guid userId)
        => await _context.CartItems.Where(c => c.UserId == userId).ToListAsync();

    public async Task<CartItem?> GetByUserAndProductAsync(Guid userId, Guid productId)
        => await _context.CartItems.FirstOrDefaultAsync(c => c.UserId == userId && c.ProductId == productId);

    public async Task AddAsync(CartItem item)
    {
        await _context.CartItems.AddAsync(item);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CartItem item)
    {
        _context.CartItems.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var item = await GetByIdAsync(id);
        if (item != null)
        {
            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ClearUserCartAsync(Guid userId)
    {
        var items = await GetByUserIdAsync(userId);
        _context.CartItems.RemoveRange(items);
        await _context.SaveChangesAsync();
    }
}
