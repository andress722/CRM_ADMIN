using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/shipping")]
public class ShippingController : ControllerBase
{
    private readonly ShippingService _service;

    public ShippingController(ShippingService service)
        => _service = service;

    [HttpGet("quotes")]
    public async Task<IActionResult> Quotes([FromQuery] string zipCode)
    {
        var normalizedZip = NormalizeDigits(zipCode ?? string.Empty);
        if (!IsValidZipCode(normalizedZip))
        {
            return BadRequest(new { message = "Invalid zip code" });
        }

        var quotes = await _service.GetQuotesAsync(normalizedZip);
        return Ok(quotes);
    }

    [HttpPost("shipments")]
    public async Task<IActionResult> CreateShipment([FromBody] ShipmentRequest request)
    {
        if (request.OrderId == Guid.Empty)
        {
            return BadRequest(new { message = "OrderId is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Provider))
        {
            return BadRequest(new { message = "Provider is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Service))
        {
            return BadRequest(new { message = "Service is required" });
        }

        var trimmedAddress = request.Address?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedAddress))
        {
            return BadRequest(new { message = "Address is required" });
        }

        if (trimmedAddress.Length is < 5 or > 1000)
        {
            return BadRequest(new { message = "Address must be between 5 and 1000 characters" });
        }

        var shipment = await _service.CreateShipmentAsync(request.OrderId, request.Provider, request.Service, trimmedAddress);
        return Ok(new { id = shipment.Id, trackingNumber = shipment.TrackingNumber });
    }

    [HttpGet("track/{trackingNumber}")]
    [AllowAnonymous]
    public async Task<IActionResult> Track(string trackingNumber)
    {
        var tracked = await _service.TrackAsync(trackingNumber);
        if (tracked == null)
        {
            return NotFound();
        }

        var (shipment, events) = tracked.Value;
        var updates = events.Select(e => new { status = e.Status, at = e.OccurredAt });
        return Ok(new { trackingNumber = shipment.TrackingNumber, status = shipment.Status, updates });
    }

    [HttpPost("/api/webhooks/shipping")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook([FromBody] object payload)
    {
        await _service.HandleWebhookAsync(payload);
        return Ok(new { message = "Shipping webhook received" });
    }

    private static string NormalizeDigits(string value)
        => new string(value.Where(char.IsDigit).ToArray());

    private static bool IsValidZipCode(string zipCode)
        => zipCode.Length == 8;

    public record ShipmentRequest(Guid OrderId, string Provider, string Service, string Address);
}
