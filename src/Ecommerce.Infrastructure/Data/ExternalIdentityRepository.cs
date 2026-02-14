using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ExternalIdentityRepository : IExternalIdentityRepository
{
    private readonly EcommerceDbContext _context;

    public ExternalIdentityRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<ExternalIdentity?> GetByProviderAsync(string provider, string providerUserId)
        => await _context.ExternalIdentities.FirstOrDefaultAsync(x => x.Provider == provider && x.ProviderUserId == providerUserId);

    public async Task AddAsync(ExternalIdentity identity)
    {
        await _context.ExternalIdentities.AddAsync(identity);
        await _context.SaveChangesAsync();
    }
}
