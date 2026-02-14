using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ShipmentRepository : IShipmentRepository
{
    private readonly EcommerceDbContext _context;

    public ShipmentRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(Shipment shipment)
    {
        await _context.Shipments.AddAsync(shipment);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Shipment shipment)
    {
        _context.Shipments.Update(shipment);
        await _context.SaveChangesAsync();
    }

    public async Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber)
        => await _context.Shipments.FirstOrDefaultAsync(s => s.TrackingNumber == trackingNumber);
}
