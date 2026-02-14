namespace Ecommerce.Domain.Entities;

public class CrmLead
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string Owner { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Status { get; set; } = "New";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
