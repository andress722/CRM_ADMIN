using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ICrmLeadRepository
{
    Task<IEnumerable<CrmLead>> GetAllAsync();
    Task<CrmLead?> GetByIdAsync(Guid id);
    Task AddAsync(CrmLead lead);
    Task UpdateAsync(CrmLead lead);
    Task DeleteAsync(Guid id);
}
