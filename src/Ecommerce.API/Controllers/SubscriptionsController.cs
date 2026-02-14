using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly SubscriptionService _service;

    public SubscriptionsController(SubscriptionService service)
        => _service = service;

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] SubscriptionRequest request)
    {
        try
        {
            var subscription = await _service.CreateSubscriptionAsync(request.Plan, request.Email);
            return Ok(subscription);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id)
    {
        try
        {
            var subscription = await _service.GetSubscriptionAsync(id);
            return Ok(subscription);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var cancelled = await _service.CancelSubscriptionAsync(id);
            return Ok(cancelled);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/retry")]
    [Authorize]
    public async Task<IActionResult> Retry(Guid id)
    {
        try
        {
            var subscription = await _service.RetryBillingAsync(id);
            return Ok(subscription);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public record SubscriptionRequest(string Plan, string Email);
}
