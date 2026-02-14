using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ICrmActivityRepository
{
    Task<IEnumerable<CrmActivity>> GetAllAsync();
    Task<CrmActivity?> GetByIdAsync(Guid id);
    Task AddAsync(CrmActivity activity);
    Task UpdateAsync(CrmActivity activity);
    Task DeleteAsync(Guid id);
}
