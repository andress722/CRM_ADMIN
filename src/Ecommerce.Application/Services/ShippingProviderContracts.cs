namespace Ecommerce.Application.Services;

public record ShippingQuote(string Provider, string Service, decimal Price, int Days);

public interface IShippingProvider
{
    Task<IReadOnlyList<ShippingQuote>> GetQuotesAsync(string zipCode);
    Task<(string trackingNumber, string status)?> CreateShipmentAsync(Guid orderId, string service, string address);
    Task<(string status, DateTime? occurredAt)?> TrackAsync(string trackingNumber);
}
