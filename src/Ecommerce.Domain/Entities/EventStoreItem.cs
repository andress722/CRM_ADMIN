using System;

namespace Ecommerce.Domain.Entities;

public class EventStoreItem
{
    public Guid Id { get; set; }
    public string EventType { get; set; }
    public string Payload { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public int Attempts { get; set; }
    public string Status { get; set; } = "pending";
}
