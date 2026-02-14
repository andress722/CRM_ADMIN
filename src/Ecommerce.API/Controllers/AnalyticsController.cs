using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly AnalyticsService _service;

    public AnalyticsController(AnalyticsService service)
        => _service = service;

    [HttpPost("events")]
    public async Task<IActionResult> Track([FromBody] AnalyticsEvent @event)
    {
        @event.Id = Guid.NewGuid();
        @event.CreatedAt = DateTime.UtcNow;
        await _service.TrackAsync(@event);
        return Ok(new { message = "Event tracked" });
    }
}
