using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id);
    Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<Order>> GetAllAsync();
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
    Task DeleteAsync(Guid id);
}
