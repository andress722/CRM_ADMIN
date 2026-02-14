using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class TwoFactorSessionRepository : ITwoFactorSessionRepository
{
    private readonly EcommerceDbContext _context;

    public TwoFactorSessionRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<TwoFactorSession?> GetByIdAsync(Guid id)
        => await _context.TwoFactorSessions.FirstOrDefaultAsync(s => s.Id == id);

    public async Task AddAsync(TwoFactorSession session)
    {
        await _context.TwoFactorSessions.AddAsync(session);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var session = await GetByIdAsync(id);
        if (session == null)
        {
            return;
        }

        _context.TwoFactorSessions.Remove(session);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteExpiredAsync(DateTime now)
    {
        var expired = await _context.TwoFactorSessions.Where(s => s.ExpiresAt <= now).ToListAsync();
        if (expired.Count == 0)
        {
            return;
        }

        _context.TwoFactorSessions.RemoveRange(expired);
        await _context.SaveChangesAsync();
    }
}
