using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class WebhookRepository : IWebhookRepository
{
    private readonly EcommerceDbContext _context;

    public WebhookRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<IEnumerable<Webhook>> GetAllAsync()
    {
        return await _context.Webhooks.ToListAsync();
    }

    public async Task<Webhook?> GetByIdAsync(Guid id)
    {
        return await _context.Webhooks.FirstOrDefaultAsync(w => w.Id == id);
    }

    public async Task AddAsync(Webhook webhook)
    {
        await _context.Webhooks.AddAsync(webhook);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Webhook webhook)
    {
        _context.Webhooks.Update(webhook);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var webhook = await GetByIdAsync(id);
        if (webhook != null)
        {
            _context.Webhooks.Remove(webhook);
            await _context.SaveChangesAsync();
        }
    }
}
