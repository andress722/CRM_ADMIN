using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class WebhookDeliveryRepository : IWebhookDeliveryRepository
{
    private readonly EcommerceDbContext _context;

    public WebhookDeliveryRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(WebhookDelivery delivery)
    {
        await _context.WebhookDeliveries.AddAsync(delivery);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WebhookDelivery delivery)
    {
        _context.WebhookDeliveries.Update(delivery);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<WebhookDelivery>> GetPendingAsync(DateTime now, int take)
    {
        return await _context.WebhookDeliveries
            .Where(d => d.Status == "Pending" && (d.NextRetryAt == null || d.NextRetryAt <= now))
            .OrderBy(d => d.CreatedAt)
            .Take(take)
            .ToListAsync();
    }
}
