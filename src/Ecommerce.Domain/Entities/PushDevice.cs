namespace Ecommerce.Domain.Entities;

public class PushDevice
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}
