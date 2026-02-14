using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ITwoFactorSessionRepository
{
    Task<TwoFactorSession?> GetByIdAsync(Guid id);
    Task AddAsync(TwoFactorSession session);
    Task DeleteAsync(Guid id);
    Task DeleteExpiredAsync(DateTime now);
}
