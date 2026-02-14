using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface ITwoFactorProfileRepository
{
    Task<TwoFactorProfile?> GetByUserIdAsync(Guid userId);
    Task UpsertAsync(TwoFactorProfile profile);
    Task UpdateAsync(TwoFactorProfile profile);
}
