namespace Ecommerce.Domain.Entities;

public class TwoFactorProfile
{
    public Guid UserId { get; set; }
    public string Secret { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string RecoveryCodes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
