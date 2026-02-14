namespace Ecommerce.Domain.Entities;

public class WishlistItem
{
    public Guid Id { get; set; }
    public Guid WishlistId { get; set; }
    public Guid ProductId { get; set; }
    public DateTime CreatedAt { get; set; }
}
