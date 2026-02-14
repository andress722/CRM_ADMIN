using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class SubscriptionRepository : ISubscriptionRepository
{
    private readonly EcommerceDbContext _context;

    public SubscriptionRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(Subscription subscription)
    {
        await _context.Subscriptions.AddAsync(subscription);
        await _context.SaveChangesAsync();
    }

    public async Task<Subscription?> GetByIdAsync(Guid id)
        => await _context.Subscriptions.FirstOrDefaultAsync(s => s.Id == id);

    public async Task UpdateAsync(Subscription subscription)
    {
        _context.Subscriptions.Update(subscription);
        await _context.SaveChangesAsync();
    }
}
