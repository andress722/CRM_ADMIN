using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly WebhookService _service;

    public WebhooksController(WebhookService service)
        => _service = service;

    [HttpGet]
    public async Task<IActionResult> List() => Ok(await _service.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WebhookCreateRequest request)
    {
        var webhook = await _service.CreateAsync(request.Url, request.Events ?? new List<string>());
        return Ok(webhook);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(new { message = "Webhook deleted" });
    }

    [HttpPost("publish")]
    public async Task<IActionResult> Publish([FromBody] PublishRequest request)
    {
        await _service.PublishAsync(request.EventType, request.Payload);
        return Ok(new { message = "Deliveries enqueued" });
    }

    public record WebhookCreateRequest(string Url, List<string>? Events);
    public record PublishRequest(string EventType, string Payload);
}
