namespace Ecommerce.Domain.Entities;

public class CrmDeal
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string Stage { get; set; } = "Prospecting";
    public int Probability { get; set; }
    public DateTime? ExpectedClose { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
