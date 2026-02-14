using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IWebhookRepository
{
    Task<IEnumerable<Webhook>> GetAllAsync();
    Task<Webhook?> GetByIdAsync(Guid id);
    Task AddAsync(Webhook webhook);
    Task UpdateAsync(Webhook webhook);
    Task DeleteAsync(Guid id);
}
