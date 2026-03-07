namespace Ecommerce.Domain.Entities;

public class Subscription
{
    public Guid Id { get; set; }
    public string Plan { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? LastBilledAt { get; set; }
    public DateTime? NextBillingAt { get; set; }

    public int BillingRetryCount { get; set; }
    public string? LastBillingError { get; set; }
    public string? LastTransactionId { get; set; }
    public DateTime? CurrentPeriodStartAt { get; set; }
    public DateTime? CurrentPeriodEndAt { get; set; }
}
