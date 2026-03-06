namespace Ecommerce.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public bool IsBlocked { get; set; }
    public string Role { get; set; } = "User";
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool MarketingEmailOptIn { get; set; }
    public bool AnalyticsConsent { get; set; }
    public DateTime? ConsentUpdatedAt { get; set; }
    public bool IsAnonymized { get; set; }
    public DateTime CreatedAt { get; set; }
}


