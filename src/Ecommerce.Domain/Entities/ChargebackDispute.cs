namespace Ecommerce.Domain.Entities;

public class ChargebackDispute
{
    public Guid Id { get; set; }
    public Guid ChargebackId { get; set; }
    public string Payload { get; set; } = string.Empty;
    public string Status { get; set; } = "Submitted";
    public DateTime CreatedAt { get; set; }
}
