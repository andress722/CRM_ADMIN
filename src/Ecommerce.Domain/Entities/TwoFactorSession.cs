namespace Ecommerce.Domain.Entities;

public class TwoFactorSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Secret { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
