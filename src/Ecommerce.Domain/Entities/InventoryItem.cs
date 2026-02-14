namespace Ecommerce.Domain.Entities;

public class InventoryItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public int ReorderLevel { get; set; }
    public DateTime UpdatedAt { get; set; }
}
