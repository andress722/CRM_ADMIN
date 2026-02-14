using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken?> GetByTokenAsync(string token);
    Task AddAsync(PasswordResetToken token);
    Task UpdateAsync(PasswordResetToken token);
}
