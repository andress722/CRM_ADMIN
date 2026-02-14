using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ICrmDealRepository
{
    Task<IEnumerable<CrmDeal>> GetAllAsync();
    Task<CrmDeal?> GetByIdAsync(Guid id);
    Task AddAsync(CrmDeal deal);
    Task UpdateAsync(CrmDeal deal);
    Task DeleteAsync(Guid id);
}
