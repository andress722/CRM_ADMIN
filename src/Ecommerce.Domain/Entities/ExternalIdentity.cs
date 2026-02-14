namespace Ecommerce.Domain.Entities;

public class ExternalIdentity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ProviderUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
