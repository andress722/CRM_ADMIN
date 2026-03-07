using System.Text.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services;

public class ShippingService
{
    private readonly IShipmentRepository _shipments;
    private readonly IShipmentTrackingEventRepository _events;
    private readonly IShippingProvider _provider;
    private readonly ILogger<ShippingService> _logger;

    public ShippingService(
        IShipmentRepository shipments,
        IShipmentTrackingEventRepository events,
        IShippingProvider provider,
        ILogger<ShippingService> logger)
    {
        _shipments = shipments;
        _events = events;
        _provider = provider;
        _logger = logger;
    }

    public Task<IReadOnlyList<ShippingQuote>> GetQuotesAsync(string zipCode)
        => _provider.GetQuotesAsync(zipCode);

    public async Task<Shipment> CreateShipmentAsync(Guid orderId, string provider, string service, string address)
    {
        var now = DateTime.UtcNow;
        var external = await _provider.CreateShipmentAsync(orderId, service, address);
        var usedSyntheticTracking = string.IsNullOrWhiteSpace(external?.trackingNumber);
        var trackingNumber = usedSyntheticTracking
            ? $"TRK-{Guid.NewGuid().ToString("N")[..10].ToUpperInvariant()}"
            : external!.Value.trackingNumber;
        var status = external?.status ?? "Created";

        if (usedSyntheticTracking)
        {
            _logger.LogWarning(
                "Shipping fallback tracking activated. orderId={OrderId} provider={Provider} service={Service} trackingNumber={TrackingNumber}",
                orderId,
                provider,
                service,
                trackingNumber);
        }

        var shipment = new Shipment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Provider = provider,
            Service = service,
            Address = address,
            TrackingNumber = trackingNumber,
            Status = status,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _shipments.AddAsync(shipment);
        await _events.AddAsync(new ShipmentTrackingEvent
        {
            Id = Guid.NewGuid(),
            ShipmentId = shipment.Id,
            Status = status,
            OccurredAt = now,
            CreatedAt = now
        });

        return shipment;
    }

    public async Task<(Shipment shipment, IEnumerable<ShipmentTrackingEvent> events)?> TrackAsync(string trackingNumber)
    {
        var shipment = await _shipments.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null)
        {
            return null;
        }

        var external = await _provider.TrackAsync(trackingNumber);
        if (external != null && !string.Equals(shipment.Status, external.Value.status, StringComparison.OrdinalIgnoreCase))
        {
            var now = DateTime.UtcNow;
            shipment.Status = external.Value.status;
            shipment.UpdatedAt = now;
            await _shipments.UpdateAsync(shipment);

            await _events.AddAsync(new ShipmentTrackingEvent
            {
                Id = Guid.NewGuid(),
                ShipmentId = shipment.Id,
                Status = shipment.Status,
                OccurredAt = external.Value.occurredAt ?? now,
                CreatedAt = now
            });
        }

        var events = await _events.GetByShipmentIdAsync(shipment.Id);
        return (shipment, events);
    }

    public async Task<bool> HandleWebhookAsync(object payload)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload);
            var element = JsonSerializer.Deserialize<JsonElement>(json);
            if (!element.TryGetProperty("trackingNumber", out var trackingProperty))
            {
                return false;
            }

            var trackingNumber = trackingProperty.GetString();
            if (string.IsNullOrWhiteSpace(trackingNumber))
            {
                return false;
            }

            var shipment = await _shipments.GetByTrackingNumberAsync(trackingNumber);
            if (shipment == null)
            {
                return false;
            }

            var status = element.TryGetProperty("status", out var statusProperty)
                ? statusProperty.GetString() ?? shipment.Status
                : shipment.Status;

            var occurredAt = element.TryGetProperty("occurredAt", out var occurredProperty)
                && occurredProperty.ValueKind == JsonValueKind.String
                && DateTime.TryParse(occurredProperty.GetString(), out var parsed)
                ? parsed
                : DateTime.UtcNow;

            shipment.Status = status;
            shipment.UpdatedAt = DateTime.UtcNow;
            await _shipments.UpdateAsync(shipment);

            await _events.AddAsync(new ShipmentTrackingEvent
            {
                Id = Guid.NewGuid(),
                ShipmentId = shipment.Id,
                Status = status,
                OccurredAt = occurredAt,
                CreatedAt = DateTime.UtcNow
            });

            return true;
        }
        catch
        {
            return false;
        }
    }
}
