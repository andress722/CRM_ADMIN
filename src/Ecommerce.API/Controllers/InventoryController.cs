using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/inventory")]
public class InventoryController : ControllerBase
{
    private readonly InventoryService _service;

    public InventoryController(InventoryService service)
        => _service = service;

    [HttpGet("{productId:guid}")]
    public async Task<IActionResult> Get(Guid productId)
    {
        var item = await _service.GetAsync(productId);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock() => Ok(await _service.GetLowStockAsync());

    [HttpPost("{productId:guid}/adjust")]
    public async Task<IActionResult> Adjust(Guid productId, [FromBody] AdjustRequest request)
    {
        var item = await _service.AdjustAsync(productId, request.Delta, request.Reason);
        return Ok(item);
    }

    [HttpPost("{productId:guid}/count")]
    public async Task<IActionResult> Count(Guid productId, [FromBody] CountRequest request)
    {
        var item = await _service.CountAsync(productId, request.Quantity);
        return Ok(item);
    }

    [HttpGet("{productId:guid}/history")]
    public async Task<IActionResult> History(Guid productId)
    {
        return Ok(await _service.HistoryAsync(productId));
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferRequest request)
    {
        var transfer = await _service.TransferAsync(request.ProductId, request.Quantity, request.FromWarehouse, request.ToWarehouse);
        return Ok(transfer);
    }

    public record AdjustRequest(int Delta, string Reason);
    public record CountRequest(int Quantity);
    public record TransferRequest(Guid ProductId, int Quantity, Guid FromWarehouse, Guid ToWarehouse);
}
