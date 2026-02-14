namespace Ecommerce.Domain.Entities;

public class Shipment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Service { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Created";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
