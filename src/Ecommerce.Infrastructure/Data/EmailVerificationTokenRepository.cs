using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly EcommerceDbContext _context;

    public EmailVerificationTokenRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<EmailVerificationToken?> GetByTokenAsync(string token)
    {
        return await _context.EmailVerificationTokens.FirstOrDefaultAsync(t => t.Token == token);
    }

    public async Task AddAsync(EmailVerificationToken token)
    {
        await _context.EmailVerificationTokens.AddAsync(token);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(EmailVerificationToken token)
    {
        _context.EmailVerificationTokens.Update(token);
        await _context.SaveChangesAsync();
    }
}
