using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class CouponRepository : ICouponRepository
{
    private readonly EcommerceDbContext _context;

    public CouponRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<Coupon>> GetAllAsync()
        => await _context.Coupons
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

    public async Task<Coupon?> GetByIdAsync(Guid id)
        => await _context.Coupons.FirstOrDefaultAsync(x => x.Id == id);

    public async Task AddAsync(Coupon coupon)
    {
        await _context.Coupons.AddAsync(coupon);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Coupon coupon)
    {
        _context.Coupons.Update(coupon);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            return;
        }

        _context.Coupons.Remove(existing);
        await _context.SaveChangesAsync();
    }
}
