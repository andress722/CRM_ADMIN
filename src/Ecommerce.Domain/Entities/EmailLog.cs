namespace Ecommerce.Domain.Entities;

public class EmailLog
{
    public Guid Id { get; set; }
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = "Sent";
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
}
