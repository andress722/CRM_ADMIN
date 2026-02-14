using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IShipmentTrackingEventRepository
{
    Task AddAsync(ShipmentTrackingEvent trackingEvent);
    Task<IEnumerable<ShipmentTrackingEvent>> GetByShipmentIdAsync(Guid shipmentId);
}
