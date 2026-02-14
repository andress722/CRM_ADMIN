using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IEmailVerificationTokenRepository
{
    Task<EmailVerificationToken?> GetByTokenAsync(string token);
    Task AddAsync(EmailVerificationToken token);
    Task UpdateAsync(EmailVerificationToken token);
}
