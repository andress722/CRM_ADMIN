using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class UserAddressRepository : IUserAddressRepository
{
    private readonly EcommerceDbContext _context;

    public UserAddressRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(UserAddress address)
    {
        await _context.UserAddresses.AddAsync(address);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(UserAddress address)
    {
        _context.UserAddresses.Update(address);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var address = await _context.UserAddresses.FirstOrDefaultAsync(a => a.Id == id);
        if (address == null)
        {
            return;
        }

        _context.UserAddresses.Remove(address);
        await _context.SaveChangesAsync();
    }

    public async Task<UserAddress?> GetByIdAsync(Guid id)
        => await _context.UserAddresses.FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IEnumerable<UserAddress>> GetByUserIdAsync(Guid userId)
        => await _context.UserAddresses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

    public async Task ClearDefaultAsync(Guid userId)
    {
        var currentDefaults = await _context.UserAddresses
            .Where(a => a.UserId == userId && a.IsDefault)
            .ToListAsync();

        if (!currentDefaults.Any())
        {
            return;
        }

        foreach (var address in currentDefaults)
        {
            address.IsDefault = false;
            address.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }
}
