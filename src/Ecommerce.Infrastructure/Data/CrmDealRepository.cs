using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CrmDealRepository : ICrmDealRepository
{
    private readonly EcommerceDbContext _context;

    public CrmDealRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<CrmDeal>> GetAllAsync()
        => await _context.CrmDeals.AsNoTracking().OrderByDescending(d => d.CreatedAt).ToListAsync();

    public async Task<CrmDeal?> GetByIdAsync(Guid id)
        => await _context.CrmDeals.FirstOrDefaultAsync(d => d.Id == id);

    public async Task AddAsync(CrmDeal deal)
    {
        await _context.CrmDeals.AddAsync(deal);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CrmDeal deal)
    {
        _context.CrmDeals.Update(deal);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var deal = await GetByIdAsync(id);
        if (deal == null) return;
        _context.CrmDeals.Remove(deal);
        await _context.SaveChangesAsync();
    }
}
