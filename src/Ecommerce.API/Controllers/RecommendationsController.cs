using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class RecommendationsController : ControllerBase
{
    private readonly OrderService _orderService;
    private readonly ProductService _productService;
    private readonly IAnalyticsEventRepository _analyticsEvents;

    public RecommendationsController(
        OrderService orderService,
        ProductService productService,
        IAnalyticsEventRepository analyticsEvents)
    {
        _orderService = orderService;
        _productService = productService;
        _analyticsEvents = analyticsEvents;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecommendations([FromQuery] Guid? userId = null, [FromQuery] int limit = 5)
    {
        limit = limit <= 0 ? 5 : Math.Min(limit, 50);

        var effectiveUserId = userId ?? GetOptionalCurrentUserId();
        var allProducts = (await _productService.GetAllProductsAsync()).ToList();
        var events = (await _analyticsEvents.GetSinceAsync(DateTime.UtcNow.AddDays(-90))).ToList();

        if (effectiveUserId.HasValue)
        {
            var userViewed = events
                .Where(e => e.UserId == effectiveUserId && e.Type.Equals("ProductView", StringComparison.OrdinalIgnoreCase))
                .Where(e => Guid.TryParse(e.Label, out _))
                .Select(e => Guid.Parse(e.Label!))
                .ToList();

            if (userViewed.Count > 0)
            {
                var viewedSet = userViewed.ToHashSet();
                var preferredCategories = allProducts
                    .Where(p => viewedSet.Contains(p.Id))
                    .GroupBy(p => p.Category)
                    .OrderByDescending(g => g.Count())
                    .Select(g => g.Key)
                    .ToList();

                var personalized = allProducts
                    .Where(p => !viewedSet.Contains(p.Id))
                    .OrderByDescending(p => preferredCategories.IndexOf(p.Category) >= 0 ? 100 - preferredCategories.IndexOf(p.Category) : 0)
                    .ThenByDescending(p => p.IsFeatured)
                    .ThenByDescending(p => p.ViewCount)
                    .Take(limit)
                    .Select(p => new
                    {
                        id = p.Id.ToString(),
                        name = p.Name,
                        price = p.Price,
                        category = p.Category,
                        score = p.ViewCount,
                        reason = "BasedOnViews"
                    })
                    .ToList();

                if (personalized.Count > 0)
                {
                    return Ok(personalized);
                }
            }
        }

        var globalViewCounts = events
            .Where(e => e.Type.Equals("ProductView", StringComparison.OrdinalIgnoreCase))
            .Where(e => Guid.TryParse(e.Label, out _))
            .GroupBy(e => Guid.Parse(e.Label!))
            .ToDictionary(g => g.Key, g => g.Count());

        var globalByViews = allProducts
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => globalViewCounts.TryGetValue(p.Id, out var count) ? count : p.ViewCount)
            .Take(limit)
            .Select(p => new
            {
                id = p.Id.ToString(),
                name = p.Name,
                price = p.Price,
                category = p.Category,
                score = globalViewCounts.TryGetValue(p.Id, out var count) ? count : p.ViewCount,
                reason = "GlobalViews"
            })
            .ToList();

        if (globalByViews.Count > 0)
        {
            return Ok(globalByViews);
        }

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
                    score = t.TotalQuantitySold,
                    reason = "TopSales"
                });
            }
            catch
            {
                // ignore missing product
            }
        }

        return Ok(result);
    }

    private Guid? GetOptionalCurrentUserId()
    {
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (Guid.TryParse(sub, out var userId))
        {
            return userId;
        }

        return null;
    }
}
