namespace Ecommerce.Domain.Entities;

public class CrmActivity
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = "Open";
    public DateTime? DueDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
