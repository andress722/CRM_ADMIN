namespace Ecommerce.Domain.Entities;

public class InventoryTransfer
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public Guid FromWarehouseId { get; set; }
    public Guid ToWarehouseId { get; set; }
    public string Status { get; set; } = "Recorded";
    public DateTime CreatedAt { get; set; }
}
