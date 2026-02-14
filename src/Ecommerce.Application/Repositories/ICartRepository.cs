using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ICartRepository
{
    Task<CartItem?> GetByIdAsync(Guid id);
    Task<IEnumerable<CartItem>> GetByUserIdAsync(Guid userId);
    Task<CartItem?> GetByUserAndProductAsync(Guid userId, Guid productId);
    Task AddAsync(CartItem item);
    Task UpdateAsync(CartItem item);
    Task DeleteAsync(Guid id);
    Task ClearUserCartAsync(Guid userId);
}
