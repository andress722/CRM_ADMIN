using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class EmailLogRepository : IEmailLogRepository
{
    private readonly EcommerceDbContext _context;

    public EmailLogRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(EmailLog log)
    {
        await _context.EmailLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<EmailLog>> GetRecentAsync(int take)
    {
        return await _context.EmailLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(take)
            .ToListAsync();
    }
}
