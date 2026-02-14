using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ReviewRepository : IReviewRepository
{
    private readonly EcommerceDbContext _context;

    public ReviewRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(Review review)
    {
        await _context.Reviews.AddAsync(review);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Review review)
    {
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            return;
        }

        _context.Reviews.Remove(existing);
        await _context.SaveChangesAsync();
    }

    public async Task<Review?> GetByIdAsync(Guid id)
        => await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);

    public async Task<IEnumerable<Review>> GetByProductIdAsync(Guid productId)
        => await _context.Reviews.Where(r => r.ProductId == productId).ToListAsync();
}
