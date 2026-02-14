namespace Ecommerce.Domain.Entities;

public class AffiliateConversion
{
    public Guid Id { get; set; }
    public Guid PartnerId { get; set; }
    public Guid OrderId { get; set; }
    public decimal Amount { get; set; }
    public decimal CommissionAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}
