using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IRefundRepository
{
    Task AddAsync(Refund refund);
    Task<IEnumerable<Refund>> GetAllAsync();
    Task<Refund?> GetByIdAsync(Guid id);
    Task UpdateAsync(Refund refund);
}
