namespace Ecommerce.Domain.Entities;

public class InventoryMovement
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public int QuantityBefore { get; set; }
    public int QuantityAfter { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
