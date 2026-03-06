namespace Ecommerce.Domain.Entities;

public class AdminProfile
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public string PreferencesJson { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; }
}
