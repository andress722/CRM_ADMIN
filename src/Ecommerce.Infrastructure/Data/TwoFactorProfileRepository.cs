using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class TwoFactorProfileRepository : ITwoFactorProfileRepository
{
    private readonly EcommerceDbContext _context;

    public TwoFactorProfileRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<TwoFactorProfile?> GetByUserIdAsync(Guid userId)
        => await _context.TwoFactorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

    public async Task UpsertAsync(TwoFactorProfile profile)
    {
        var existing = await GetByUserIdAsync(profile.UserId);
        if (existing == null)
        {
            await _context.TwoFactorProfiles.AddAsync(profile);
        }
        else
        {
            existing.Secret = profile.Secret;
            existing.Enabled = profile.Enabled;
            existing.RecoveryCodes = profile.RecoveryCodes;
            existing.UpdatedAt = profile.UpdatedAt;
        }

        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(TwoFactorProfile profile)
    {
        _context.TwoFactorProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }
}
