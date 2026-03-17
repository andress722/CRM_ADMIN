using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador para gerenciar produtos
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _service;
    private readonly ProductSearchService _productSearchService;
    private readonly AnalyticsService _analyticsService;

    public ProductsController(ProductService service, ProductSearchService productSearchService, AnalyticsService analyticsService)
    {
        _service = service;
        _productSearchService = productSearchService;
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Lista todos os produtos
    /// </summary>
    /// <returns>Lista de produtos</returns>
    [HttpGet]
    public async Task<IActionResult> GetAllProducts()
    {
        var products = await _service.GetAllProductsAsync();
        return Ok(products);
    }

    /// <summary>
    /// Obtém um produto por ID
    /// </summary>
    /// <param name="id">ID do produto</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        try
        {
            var product = await _service.IncrementViewCountAsync(id);
            var currentUserId = GetOptionalCurrentUserId();

            await _analyticsService.TrackAsync(new AnalyticsEvent
            {
                Id = Guid.NewGuid(),
                UserId = currentUserId,
                Type = "ProductView",
                Category = "Catalog",
                Action = "ViewProduct",
                Label = product.Id.ToString(),
                Value = 1,
                Url = $"/product/{product.Id}",
                CreatedAt = DateTime.UtcNow
            });

            return Ok(product);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lista produtos por categoria
    /// </summary>
    /// <param name="category">Categoria do produto</param>
    [HttpGet("category/{category}")]
    public async Task<IActionResult> GetProductsByCategory(string category)
    {
        var products = await _service.GetProductsByCategoryAsync(category);
        return Ok(products);
    }

    /// <summary>
    /// Pesquisa produtos com filtros
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string? query,
        [FromQuery] string? category,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        var result = await _productSearchService.SearchAsync(query, category, minPrice, maxPrice, page, pageSize, cancellationToken);
        return Ok(new SearchProductsResponse(result.Items, result.Total, result.Page, result.PageSize, result.Engine, result.Facets, result.Suggestions));
    }

    /// <summary>
    /// Cria um novo produto
    /// </summary>
    /// <param name="request">Dados do produto</param>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateProduct(CreateProductRequest request)
    {
        try
        {
            var product = await _service.CreateProductAsync(
                request.Name,
                request.Description,
                request.Price,
                request.Stock,
                request.Category,
                request.Sku,
                request.IsFeatured
            );
            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza um produto
    /// </summary>
    /// <param name="id">ID do produto</param>
    /// <param name="request">Novos dados do produto</param>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProduct(Guid id, UpdateProductRequest request)
    {
        try
        {
            var product = await _service.UpdateProductAsync(
                id,
                request.Name,
                request.Description,
                request.Price,
                request.Stock,
                request.Category,
                request.IsFeatured
            );
            return Ok(product);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
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

/// <summary>Dados para criar um produto</summary>
public record CreateProductRequest(
    /// <summary>Nome do produto</summary>
    string Name,
    /// <summary>Descrição do produto</summary>
    string Description,
    /// <summary>Preço do produto</summary>
    decimal Price,
    /// <summary>Quantidade em estoque</summary>
    int Stock,
    /// <summary>Categoria do produto</summary>
    string Category,
    /// <summary>SKU do produto</summary>
    string Sku,
    /// <summary>Produto em destaque</summary>
    bool IsFeatured = false
);

/// <summary>Dados para atualizar um produto</summary>
public record UpdateProductRequest(
    string Name,
    string Description,
    decimal Price,
    int Stock,
    string Category,
    bool? IsFeatured
);

/// <summary>Resposta paginada de busca</summary>
public record SearchProductsResponse(
    IReadOnlyList<Ecommerce.Domain.Entities.Product> Items,
    int Total,
    int Page,
    int PageSize,
    string Engine,
    IReadOnlyList<SearchFacetBucket> Facets,
    IReadOnlyList<string> Suggestions
);
