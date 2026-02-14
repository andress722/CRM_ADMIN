namespace Ecommerce.Domain.Entities;

public class AnalyticsEvent
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? Label { get; set; }
    public decimal? Value { get; set; }
    public string? Url { get; set; }
    public DateTime CreatedAt { get; set; }
}
