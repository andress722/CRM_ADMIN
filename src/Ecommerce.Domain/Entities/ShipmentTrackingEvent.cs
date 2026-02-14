namespace Ecommerce.Domain.Entities;

public class ShipmentTrackingEvent
{
    public Guid Id { get; set; }
    public Guid ShipmentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
