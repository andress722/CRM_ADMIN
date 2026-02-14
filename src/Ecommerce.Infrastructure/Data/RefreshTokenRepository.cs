using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly EcommerceDbContext _context;

    public RefreshTokenRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        return await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public async Task<IEnumerable<RefreshToken>> GetActiveByUserIdAsync(Guid userId, DateTime now)
    {
        return await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync();
    }

    public async Task AddAsync(RefreshToken refreshToken)
    {
        await _context.RefreshTokens.AddAsync(refreshToken);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(RefreshToken refreshToken)
    {
        _context.RefreshTokens.Update(refreshToken);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt)
    {
        var tokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync();

        if (!tokens.Any()) return;

        foreach (var t in tokens)
        {
            t.RevokedAt = revokedAt;
        }

        _context.RefreshTokens.UpdateRange(tokens);
        await _context.SaveChangesAsync();
    }
}
