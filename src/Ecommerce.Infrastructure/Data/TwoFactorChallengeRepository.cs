using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class TwoFactorChallengeRepository : ITwoFactorChallengeRepository
{
    private readonly EcommerceDbContext _context;

    public TwoFactorChallengeRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<TwoFactorChallenge?> GetByIdAsync(Guid id)
        => await _context.TwoFactorChallenges.FirstOrDefaultAsync(c => c.Id == id);

    public async Task AddAsync(TwoFactorChallenge challenge)
    {
        await _context.TwoFactorChallenges.AddAsync(challenge);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(TwoFactorChallenge challenge)
    {
        _context.TwoFactorChallenges.Update(challenge);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var challenge = await GetByIdAsync(id);
        if (challenge == null)
        {
            return;
        }

        _context.TwoFactorChallenges.Remove(challenge);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteExpiredAsync(DateTime now)
    {
        var expired = await _context.TwoFactorChallenges
            .Where(c => c.ExpiresAt <= now && c.VerifiedAt == null)
            .ToListAsync();

        if (expired.Count == 0)
        {
            return;
        }

        _context.TwoFactorChallenges.RemoveRange(expired);
        await _context.SaveChangesAsync();
    }
}
