using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly EcommerceDbContext _context;

    public PasswordResetTokenRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<PasswordResetToken?> GetByTokenAsync(string token)
    {
        return await _context.PasswordResetTokens.FirstOrDefaultAsync(t => t.Token == token);
    }

    public async Task AddAsync(PasswordResetToken token)
    {
        await _context.PasswordResetTokens.AddAsync(token);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PasswordResetToken token)
    {
        _context.PasswordResetTokens.Update(token);
        await _context.SaveChangesAsync();
    }
}
