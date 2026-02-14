using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/refunds")]
public class RefundsController : ControllerBase
{
    private readonly RefundService _service;

    public RefundsController(RefundService service)
        => _service = service;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RefundCreateRequest request)
    {
        if (request.OrderId == Guid.Empty)
        {
            return BadRequest(new { message = "OrderId is required" });
        }

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero" });
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "Reason is required" });
        }

        var refund = await _service.CreateAsync(request.OrderId, request.Amount, request.Reason);
        return Ok(refund);
    }

    [HttpGet]
    public async Task<IActionResult> List() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var refund = await _service.GetByIdAsync(id);
        return refund == null ? NotFound() : Ok(refund);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var refund = await _service.ApproveAsync(id);
        return refund == null ? NotFound() : Ok(refund);
    }

    [HttpPost("{id:guid}/deny")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deny(Guid id)
    {
        var refund = await _service.DenyAsync(id);
        return refund == null ? NotFound() : Ok(refund);
    }

    [HttpPost("{id:guid}/process")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Process(Guid id)
    {
        try
        {
            var refund = await _service.ProcessAsync(id);
            return refund == null ? NotFound() : Ok(refund);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("chargebacks/{id:guid}/dispute")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Dispute(Guid id, [FromBody] object payload)
    {
        var dispute = await _service.DisputeAsync(id, payload);
        return Ok(dispute);
    }

    public record RefundCreateRequest(Guid OrderId, decimal Amount, string Reason);
}
