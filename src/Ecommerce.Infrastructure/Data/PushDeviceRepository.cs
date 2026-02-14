using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class PushDeviceRepository : IPushDeviceRepository
{
    private readonly EcommerceDbContext _context;

    public PushDeviceRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<PushDevice?> GetByUserAndTokenAsync(Guid userId, string token)
        => await _context.PushDevices.FirstOrDefaultAsync(x => x.UserId == userId && x.Token == token);

    public async Task<IEnumerable<PushDevice>> GetByUserAsync(Guid userId)
        => await _context.PushDevices.Where(x => x.UserId == userId).ToListAsync();

    public async Task AddAsync(PushDevice device)
    {
        await _context.PushDevices.AddAsync(device);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PushDevice device)
    {
        _context.PushDevices.Update(device);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveAsync(PushDevice device)
    {
        _context.PushDevices.Remove(device);
        await _context.SaveChangesAsync();
    }
}
