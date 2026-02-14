namespace Ecommerce.Domain.Entities;

public class Refund
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "Pending";
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
