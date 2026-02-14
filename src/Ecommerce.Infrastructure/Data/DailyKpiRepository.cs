using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class DailyKpiRepository : IDailyKpiRepository
{
    private readonly EcommerceDbContext _context;

    public DailyKpiRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<DailyKpi?> GetByDateAsync(DateOnly date)
    {
        return await _context.DailyKpis.FirstOrDefaultAsync(k => k.Date == date);
    }

    public async Task UpsertAsync(DailyKpi kpi)
    {
        var existing = await GetByDateAsync(kpi.Date);
        if (existing == null)
        {
            await _context.DailyKpis.AddAsync(kpi);
        }
        else
        {
            existing.TotalEvents = kpi.TotalEvents;
            existing.Signups = kpi.Signups;
            existing.Logins = kpi.Logins;
            existing.Purchases = kpi.Purchases;
        }

        await _context.SaveChangesAsync();
    }
}
