namespace Ecommerce.Domain.Entities;

public class Review
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int HelpfulCount { get; set; }
    public int NotHelpfulCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
