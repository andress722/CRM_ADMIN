using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ISupportTicketRepository
{
    Task AddAsync(SupportTicket ticket);
    Task<SupportTicket?> GetByIdAsync(Guid id);
    Task<IEnumerable<SupportTicket>> GetAllAsync();
    Task UpdateAsync(SupportTicket ticket);
}
