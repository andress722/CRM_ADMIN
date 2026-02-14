using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IShipmentRepository
{
    Task AddAsync(Shipment shipment);
    Task UpdateAsync(Shipment shipment);
    Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber);
}
