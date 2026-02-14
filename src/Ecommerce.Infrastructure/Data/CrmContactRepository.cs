using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CrmContactRepository : ICrmContactRepository
{
    private readonly EcommerceDbContext _context;

    public CrmContactRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<CrmContact>> GetAllAsync()
        => await _context.CrmContacts.AsNoTracking().OrderByDescending(c => c.CreatedAt).ToListAsync();

    public async Task<CrmContact?> GetByIdAsync(Guid id)
        => await _context.CrmContacts.FirstOrDefaultAsync(c => c.Id == id);

    public async Task AddAsync(CrmContact contact)
    {
        await _context.CrmContacts.AddAsync(contact);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CrmContact contact)
    {
        _context.CrmContacts.Update(contact);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var contact = await GetByIdAsync(id);
        if (contact == null) return;
        _context.CrmContacts.Remove(contact);
        await _context.SaveChangesAsync();
    }
}
