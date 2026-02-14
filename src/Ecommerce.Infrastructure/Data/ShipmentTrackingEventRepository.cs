using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ShipmentTrackingEventRepository : IShipmentTrackingEventRepository
{
    private readonly EcommerceDbContext _context;

    public ShipmentTrackingEventRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(ShipmentTrackingEvent trackingEvent)
    {
        await _context.ShipmentTrackingEvents.AddAsync(trackingEvent);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<ShipmentTrackingEvent>> GetByShipmentIdAsync(Guid shipmentId)
        => await _context.ShipmentTrackingEvents
            .Where(e => e.ShipmentId == shipmentId)
            .OrderBy(e => e.OccurredAt)
            .ToListAsync();
}
