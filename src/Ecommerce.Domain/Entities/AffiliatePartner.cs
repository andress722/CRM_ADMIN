namespace Ecommerce.Domain.Entities;

public class AffiliatePartner
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public decimal CommissionRate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
