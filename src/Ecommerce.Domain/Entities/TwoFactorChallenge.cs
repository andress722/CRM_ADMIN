namespace Ecommerce.Domain.Entities;

public class TwoFactorChallenge
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
}
