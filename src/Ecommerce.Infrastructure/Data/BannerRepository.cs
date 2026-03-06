using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class BannerRepository : IBannerRepository
{
    private readonly EcommerceDbContext _context;

    public BannerRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<Banner>> GetAllAsync()
        => await _context.Banners
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync();

    public async Task<Banner?> GetByIdAsync(Guid id)
        => await _context.Banners.FirstOrDefaultAsync(x => x.Id == id);

    public async Task AddAsync(Banner banner)
    {
        await _context.Banners.AddAsync(banner);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Banner banner)
    {
        _context.Banners.Update(banner);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            return;
        }

        _context.Banners.Remove(existing);
        await _context.SaveChangesAsync();
    }
}
