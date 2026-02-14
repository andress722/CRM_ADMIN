using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class AnalyticsEventRepository : IAnalyticsEventRepository
{
    private readonly EcommerceDbContext _context;

    public AnalyticsEventRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(AnalyticsEvent @event)
    {
        await _context.AnalyticsEvents.AddAsync(@event);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<AnalyticsEvent>> GetSinceAsync(DateTime since)
    {
        return await _context.AnalyticsEvents
            .Where(e => e.CreatedAt >= since)
            .ToListAsync();
    }

    public async Task<int> CountSinceAsync(DateTime since)
    {
        return await _context.AnalyticsEvents.CountAsync(e => e.CreatedAt >= since);
    }
}
