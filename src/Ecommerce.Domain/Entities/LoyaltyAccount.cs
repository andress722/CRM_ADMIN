namespace Ecommerce.Domain.Entities;

public class LoyaltyAccount
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal PointsBalance { get; set; }
    public decimal LifetimeEarned { get; set; }
    public decimal LifetimeRedeemed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
