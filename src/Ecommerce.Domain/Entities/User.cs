namespace Ecommerce.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public string Role { get; set; } = "User";
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime CreatedAt { get; set; }
}
