namespace Ecommerce.Domain.Entities;

public class AdminSetting
{
    public Guid Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string EmailTemplate { get; set; } = string.Empty;
    public bool Maintenance { get; set; }
    public bool DefaultDarkMode { get; set; }
    public DateTime UpdatedAt { get; set; }
}
