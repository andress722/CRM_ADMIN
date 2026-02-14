namespace Ecommerce.Domain.Entities;

public class Webhook
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string EventTypes { get; set; } = string.Empty; // comma-separated
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
