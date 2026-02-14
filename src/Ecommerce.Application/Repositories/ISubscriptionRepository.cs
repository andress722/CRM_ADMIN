using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ISubscriptionRepository
{
    Task AddAsync(Subscription subscription);
    Task<Subscription?> GetByIdAsync(Guid id);
    Task UpdateAsync(Subscription subscription);
}
