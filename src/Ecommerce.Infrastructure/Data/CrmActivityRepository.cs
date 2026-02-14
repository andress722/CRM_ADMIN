using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CrmActivityRepository : ICrmActivityRepository
{
    private readonly EcommerceDbContext _context;

    public CrmActivityRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<CrmActivity>> GetAllAsync()
        => await _context.CrmActivities.AsNoTracking().OrderByDescending(a => a.CreatedAt).ToListAsync();

    public async Task<CrmActivity?> GetByIdAsync(Guid id)
        => await _context.CrmActivities.FirstOrDefaultAsync(a => a.Id == id);

    public async Task AddAsync(CrmActivity activity)
    {
        await _context.CrmActivities.AddAsync(activity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CrmActivity activity)
    {
        _context.CrmActivities.Update(activity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var activity = await GetByIdAsync(id);
        if (activity == null) return;
        _context.CrmActivities.Remove(activity);
        await _context.SaveChangesAsync();
    }
}
