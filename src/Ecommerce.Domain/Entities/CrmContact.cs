namespace Ecommerce.Domain.Entities;

public class CrmContact
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Segment { get; set; } = "New";
    public string Lifecycle { get; set; } = "Lead";
    public DateTime? LastTouch { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
