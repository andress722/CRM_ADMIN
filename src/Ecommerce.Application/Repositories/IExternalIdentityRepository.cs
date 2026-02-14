using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IExternalIdentityRepository
{
    Task<ExternalIdentity?> GetByProviderAsync(string provider, string providerUserId);
    Task AddAsync(ExternalIdentity identity);
}
