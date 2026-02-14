using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IWishlistRepository
{
    Task AddAsync(Wishlist wishlist);
    Task UpdateAsync(Wishlist wishlist);
    Task<Wishlist?> GetByIdAsync(Guid id);
    Task<Wishlist?> GetDefaultAsync(Guid userId);
}
