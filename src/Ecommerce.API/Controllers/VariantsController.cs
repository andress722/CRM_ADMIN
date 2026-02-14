using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/variants")]
public class VariantsController : ControllerBase
{
    private readonly ProductVariantService _service;

    public VariantsController(ProductVariantService service)
        => _service = service;

    [HttpGet("sku/{sku}")]
    public async Task<IActionResult> GetBySku(string sku)
    {
        var variant = await _service.GetBySkuAsync(sku);
        return variant == null ? NotFound() : Ok(variant);
    }

    [HttpGet("product/{productId:guid}")]
    public async Task<IActionResult> GetByProduct(Guid productId)
    {
        return Ok(await _service.GetByProductAsync(productId));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] VariantCreateRequest request)
    {
        var variant = await _service.CreateAsync(request.ProductId, request.Sku, request.Name, request.Price, request.Stock);
        return Ok(variant);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] VariantUpdateRequest request)
    {
        var variant = await _service.UpdateAsync(id, request.Name, request.Price, request.Stock);
        return variant == null ? NotFound() : Ok(variant);
    }

    [HttpPatch("{id:guid}/stock")]
    public async Task<IActionResult> UpdateStock(Guid id, [FromBody] UpdateStockRequest request)
    {
        var variant = await _service.UpdateStockAsync(id, request.Stock);
        return variant == null ? NotFound() : Ok(variant);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(new { message = "Variant deleted" });
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock() => Ok(await _service.LowStockAsync(5));

    public record VariantCreateRequest(Guid ProductId, string Sku, string Name, decimal Price, int Stock);
    public record VariantUpdateRequest(string? Name, decimal? Price, int? Stock);
    public record UpdateStockRequest(int Stock);

}
