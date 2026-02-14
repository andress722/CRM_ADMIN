using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task<IEnumerable<RefreshToken>> GetActiveByUserIdAsync(Guid userId, DateTime now);
    Task AddAsync(RefreshToken refreshToken);
    Task UpdateAsync(RefreshToken refreshToken);
    Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt);
}
