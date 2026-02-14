using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ICrmContactRepository
{
    Task<IEnumerable<CrmContact>> GetAllAsync();
    Task<CrmContact?> GetByIdAsync(Guid id);
    Task AddAsync(CrmContact contact);
    Task UpdateAsync(CrmContact contact);
    Task DeleteAsync(Guid id);
}
