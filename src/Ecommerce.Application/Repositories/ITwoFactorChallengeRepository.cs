using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ITwoFactorChallengeRepository
{
    Task<TwoFactorChallenge?> GetByIdAsync(Guid id);
    Task AddAsync(TwoFactorChallenge challenge);
    Task UpdateAsync(TwoFactorChallenge challenge);
    Task DeleteAsync(Guid id);
    Task DeleteExpiredAsync(DateTime now);
}
