using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CrmLeadRepository : ICrmLeadRepository
{
    private readonly EcommerceDbContext _context;

    public CrmLeadRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<CrmLead>> GetAllAsync()
        => await _context.CrmLeads.AsNoTracking().OrderByDescending(l => l.CreatedAt).ToListAsync();

    public async Task<CrmLead?> GetByIdAsync(Guid id)
        => await _context.CrmLeads.FirstOrDefaultAsync(l => l.Id == id);

    public async Task AddAsync(CrmLead lead)
    {
        await _context.CrmLeads.AddAsync(lead);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CrmLead lead)
    {
        _context.CrmLeads.Update(lead);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var lead = await GetByIdAsync(id);
        if (lead == null) return;
        _context.CrmLeads.Remove(lead);
        await _context.SaveChangesAsync();
    }
}
