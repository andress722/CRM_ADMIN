using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class RefundRepository : IRefundRepository
{
    private readonly EcommerceDbContext _context;

    public RefundRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(Refund refund)
    {
        await _context.Refunds.AddAsync(refund);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Refund>> GetAllAsync()
        => await _context.Refunds.OrderByDescending(r => r.CreatedAt).ToListAsync();

    public async Task<Refund?> GetByIdAsync(Guid id)
        => await _context.Refunds.FirstOrDefaultAsync(r => r.Id == id);

    public async Task UpdateAsync(Refund refund)
    {
        _context.Refunds.Update(refund);
        await _context.SaveChangesAsync();
    }
}
