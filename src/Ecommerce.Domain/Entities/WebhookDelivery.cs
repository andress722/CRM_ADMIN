namespace Ecommerce.Domain.Entities;

public class WebhookDelivery
{
    public Guid Id { get; set; }
    public Guid WebhookId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public int Attempt { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Success, Failed
    public DateTime? NextRetryAt { get; set; }
    public int? ResponseCode { get; set; }
    public string? ResponseBody { get; set; }
    public DateTime CreatedAt { get; set; }

    public Webhook? Webhook { get; set; }
}
