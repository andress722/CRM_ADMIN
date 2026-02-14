using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IWishlistItemRepository
{
    Task AddAsync(WishlistItem item);
    Task RemoveAsync(Guid id);
    Task<IEnumerable<WishlistItem>> GetByWishlistIdAsync(Guid wishlistId);
    Task<bool> ExistsAsync(Guid wishlistId, Guid productId);
}
