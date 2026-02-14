using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class RecommendationsController : ControllerBase
{
    private readonly OrderService _orderService;
    private readonly ProductService _productService;

    public RecommendationsController(OrderService orderService, ProductService productService)
    {
        _orderService = orderService;
        _productService = productService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecommendations([FromQuery] int limit = 5)
    {
        var top = (await _orderService.GetTopProductsAsync(limit)).ToList();
        var result = new List<object>();
        foreach (var t in top)
        {
            try
            {
                var p = await _productService.GetProductAsync(t.ProductId);
                result.Add(new
                {
                    id = p.Id.ToString(),
                    name = p.Name,
                    price = p.Price,
                    category = p.Category,
                    score = t.TotalQuantitySold
                });
            }
            catch
            {
                // ignore missing product
            }
        }

        return Ok(result);
    }
}
