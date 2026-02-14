using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador administrativo para gerenciar produtos, pedidos e usuários
/// </summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly ProductService _productService;
    private readonly OrderService _orderService;
    private readonly UserService _userService;
    private static readonly Dictionary<Guid, List<string>> _productImages = new();

    public AdminController(ProductService productService, OrderService orderService, UserService userService)
    {
        _productService = productService;
        _orderService = orderService;
        _userService = userService;
    }

    /// <summary>
    /// Get dashboard overview statistics
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        try
        {
            var products = (await _productService.GetAllProductsAsync()).ToList();
            var orders = (await _orderService.GetAllOrdersAsync()).ToList();
            var users = (await _userService.GetAllUsersAsync()).ToList();

            var totalRevenue = orders
                .Where(o => o.Status == OrderStatus.Delivered)
                .Sum(o => o.TotalAmount);

            var recentOrdersList = orders
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .Select(o => new
                {
                    id = o.Id.ToString(),
                    customerName = users.FirstOrDefault(u => u.Id == o.UserId)?.FullName ?? string.Empty,
                    amount = o.TotalAmount,
                    status = o.Status.ToString().ToLowerInvariant()
                })
                .ToList();

            var result = new
            {
                totalRevenue = totalRevenue,
                totalOrders = orders.Count,
                totalCustomers = users.Count,
                averageOrderValue = orders.Any() ? orders.Average(o => o.TotalAmount) : 0,
                revenueGrowth = 0,
                ordersGrowth = 0,
                revenueChange = 0,
                ordersChange = 0,
                customersChange = 0,
                conversionRate = 0,
                conversionChange = 0,
                recentOrders = recentOrdersList,
                topProducts = products.Take(5).Select(p => new
                {
                    id = p.Id.ToString(),
                    name = p.Name,
                    sales = 0
                }),
                newCustomers = 0
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving dashboard overview", error = ex.Message });
        }
    }

    #region Produtos Admin

    /// <summary>
    /// Lista todos os produtos (incluindo inativos)
    /// </summary>
    [HttpGet("products")]
    public async Task<IActionResult> GetAllProductsAdmin([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var products = (await _productService.GetAllProductsAsync()).ToList();
            var total = products.Count;

            var mapped = products
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    id = p.Id.ToString(),
                    name = p.Name,
                    sku = p.Sku,
                    description = p.Description,
                    price = p.Price,
                    stock = p.Stock,
                    category = p.Category,
                    isActive = true,
                    imageUrl = (string?)null,
                    images = Array.Empty<string>(),
                    createdAt = p.CreatedAt,
                    updatedAt = p.CreatedAt
                })
                .ToList();

            var hasPaging = Request.Query.ContainsKey("page") || Request.Query.ContainsKey("pageSize");
            if (!hasPaging)
            {
                return Ok(mapped);
            }

            var pageData = mapped
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                data = pageData,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving products", error = ex.Message });
        }
    }

    /// <summary>
    /// Cria um novo produto (Admin)
    /// </summary>
    [HttpPost("products")]
    public async Task<IActionResult> CreateProductAdmin(CreateProductRequest request)
    {
        try
        {
            var product = await _productService.CreateProductAsync(
                request.Name,
                request.Description,
                request.Price,
                request.Stock,
                request.Category,
                request.Sku
            );
            return CreatedAtAction(nameof(GetProductAdmin), new { id = product.Id }, new
            {
                id = product.Id.ToString(),
                name = product.Name,
                sku = product.Sku,
                description = product.Description,
                price = product.Price,
                stock = product.Stock,
                category = product.Category,
                isActive = true,
                imageUrl = (string?)null,
                images = Array.Empty<string>(),
                createdAt = product.CreatedAt,
                updatedAt = product.CreatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Obtém um produto específico (Admin)
    /// </summary>
    [HttpGet("products/{id}")]
    public async Task<IActionResult> GetProductAdmin(Guid id)
    {
        try
        {
            var product = await _productService.GetProductAsync(id);
            return Ok(new
            {
                id = product.Id.ToString(),
                name = product.Name,
                sku = product.Sku,
                description = product.Description,
                price = product.Price,
                stock = product.Stock,
                category = product.Category,
                isActive = true,
                imageUrl = (string?)null,
                images = Array.Empty<string>(),
                createdAt = product.CreatedAt,
                updatedAt = product.CreatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lista imagens de um produto
    /// </summary>
    [HttpGet("products/{id}/images")]
    public IActionResult GetProductImages(Guid id)
    {
        if (_productImages.TryGetValue(id, out var images))
        {
            return Ok(images);
        }

        return Ok(Array.Empty<string>());
    }

    /// <summary>
    /// Adiciona uma imagem ao produto
    /// </summary>
    [HttpPost("products/{id}/images")]
    public IActionResult AddProductImage(Guid id)
    {
        if (!_productImages.ContainsKey(id))
        {
            _productImages[id] = new List<string>();
        }

        _productImages[id].Add($"/images/products/{id}/{Guid.NewGuid()}.png");
        return Ok(new { success = true });
    }

    /// <summary>
    /// Atualiza um produto (Admin)
    /// </summary>
    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProductAdmin(Guid id, UpdateProductRequest request)
    {
        try
        {
            var product = await _productService.UpdateProductAsync(
                id,
                request.Name,
                request.Description,
                request.Price,
                request.Stock,
                request.Category
            );
            return Ok(new
            {
                id = product.Id.ToString(),
                name = product.Name,
                sku = product.Sku,
                description = product.Description,
                price = product.Price,
                stock = product.Stock,
                category = product.Category,
                isActive = true,
                imageUrl = (string?)null,
                images = Array.Empty<string>(),
                createdAt = product.CreatedAt,
                updatedAt = product.CreatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza parcialmente um produto (Admin)
    /// </summary>
    [HttpPatch("products/{id}")]
    public async Task<IActionResult> PatchProductAdmin(Guid id, [FromBody] UpdateProductPatchRequest request)
    {
        try
        {
            var current = await _productService.GetProductAsync(id);
            var product = await _productService.UpdateProductAsync(
                id,
                request.Name ?? current.Name,
                request.Description ?? current.Description,
                request.Price ?? current.Price,
                request.Stock ?? current.Stock,
                request.Category ?? current.Category
            );

            return Ok(new
            {
                id = product.Id.ToString(),
                name = product.Name,
                sku = product.Sku,
                description = product.Description,
                price = product.Price,
                stock = product.Stock,
                category = product.Category,
                isActive = true,
                imageUrl = (string?)null,
                images = Array.Empty<string>(),
                createdAt = product.CreatedAt,
                updatedAt = product.CreatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Deleta um produto (Admin)
    /// </summary>
    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProductAdmin(Guid id)
    {
        try
        {
            await _productService.DeleteProductAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza estoque de um produto
    /// </summary>
    [HttpPatch("products/{id}/stock")]
    public async Task<IActionResult> UpdateProductStock(Guid id, UpdateStockRequest request)
    {
        try
        {
            var product = await _productService.UpdateProductStockAsync(id, request.NewStock);
            return Ok(product);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    #endregion

    #region Pedidos Admin

    /// <summary>
    /// Lista todos os pedidos com paginação
    /// </summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var allOrders = (await _orderService.GetAllOrdersAsync()).ToList();
            var users = (await _userService.GetAllUsersAsync()).ToList();
            var ordersList = allOrders.ToList();
            
            // Filter by status if provided
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
            {
                ordersList = ordersList.Where(o => o.Status == orderStatus).ToList();
            }

            var mapped = ordersList
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new
                {
                    id = o.Id.ToString(),
                    userId = o.UserId.ToString(),
                    customerName = users.FirstOrDefault(u => u.Id == o.UserId)?.FullName ?? string.Empty,
                    customerEmail = users.FirstOrDefault(u => u.Id == o.UserId)?.Email ?? string.Empty,
                    status = o.Status.ToString(),
                    totalAmount = o.TotalAmount,
                    total = o.TotalAmount,
                    items = o.Items.Select(i => new
                    {
                        id = i.Id.ToString(),
                        productId = i.ProductId.ToString(),
                        quantity = i.Quantity,
                        unitPrice = i.UnitPrice,
                        subtotal = i.Subtotal,
                        name = string.Empty,
                        price = i.UnitPrice
                    }).ToList(),
                    createdAt = o.CreatedAt,
                    updatedAt = o.UpdatedAt
                })
                .ToList();

            var hasPaging = Request.Query.ContainsKey("page") || Request.Query.ContainsKey("pageSize") || Request.Query.ContainsKey("status");
            if (!hasPaging)
            {
                return Ok(mapped);
            }

            var total = mapped.Count;
            var paginatedOrders = mapped
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                data = paginatedOrders,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving orders", error = ex.Message });
        }
    }

    /// <summary>
    /// Filtra pedidos por status
    /// </summary>
    [HttpGet("orders/status/{status}")]
    public async Task<IActionResult> GetOrdersByStatus(OrderStatus status)
    {
        var orders = await _orderService.GetOrdersByStatusAsync(status);
        return Ok(orders);
    }

    /// <summary>
    /// Atualiza status do pedido
    /// </summary>
    [HttpPatch("orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(id, request.Status);
            return Ok(new { id = order.Id.ToString(), status = order.Status.ToString() });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Obtém detalhes de um pedido (compatível com frontend)
    /// </summary>
    [HttpGet("orders/{id}")]
    public async Task<IActionResult> GetOrderById(Guid id)
    {
        try
        {
            var order = await _orderService.GetOrderAsync(id);
            var user = await _userService.GetUserAsync(order.UserId);

            return Ok(new
            {
                id = order.Id.ToString(),
                userId = order.UserId.ToString(),
                customerName = user.FullName,
                customerEmail = user.Email,
                status = order.Status.ToString(),
                totalAmount = order.TotalAmount,
                total = order.TotalAmount,
                items = order.Items.Select(i => new
                {
                    id = i.Id.ToString(),
                    productId = i.ProductId.ToString(),
                    quantity = i.Quantity,
                    unitPrice = i.UnitPrice,
                    subtotal = i.Subtotal,
                    name = string.Empty,
                    price = i.UnitPrice
                }).ToList(),
                createdAt = order.CreatedAt,
                updatedAt = order.UpdatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Obtém detalhes completos de um pedido
    /// </summary>
    [HttpGet("orders/{id}/details")]
    public async Task<IActionResult> GetOrderDetailsAdmin(Guid id)
    {
        try
        {
            var order = await _orderService.GetOrderAsync(id);
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    #endregion

    #region Usuários Admin

    /// <summary>
    /// Lista todos os usuários
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>
    /// Obtém um usuário específico
    /// </summary>
    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUserAdmin(Guid id)
    {
        try
        {
            var user = await _userService.GetUserAsync(id);
            return Ok(user);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    #endregion

    #region Relatórios e Estatísticas

    /// <summary>
    /// Obtém estatísticas gerais do e-commerce
    /// </summary>
    [HttpGet("statistics/dashboard")]
    public async Task<IActionResult> GetDashboardStatistics()
    {
        var stats = await _orderService.GetDashboardStatisticsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Obtém vendas por período
    /// </summary>
    [HttpGet("statistics/sales")]
    public async Task<IActionResult> GetSalesStatistics([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var sales = await _orderService.GetSalesStatisticsAsync(startDate, endDate);
        return Ok(sales);
    }

    /// <summary>
    /// Obtém produtos mais vendidos
    /// </summary>
    [HttpGet("statistics/top-products")]
    public async Task<IActionResult> GetTopProducts([FromQuery] int limit = 10)
    {
        var topProducts = await _orderService.GetTopProductsAsync(limit);
        return Ok(topProducts);
    }

    /// <summary>
    /// Obtém categoria mais vendida
    /// </summary>
    [HttpGet("statistics/top-categories")]
    public async Task<IActionResult> GetTopCategories()
    {
        var categories = await _orderService.GetTopCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>
    /// Obtém receita total
    /// </summary>
    [HttpGet("statistics/revenue")]
    public async Task<IActionResult> GetRevenueStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var revenue = await _orderService.GetRevenueStatisticsAsync(startDate, endDate);
        return Ok(revenue);
    }

    #endregion

    #region Clientes Admin

    /// <summary>
    /// Lista todos os clientes com paginação
    /// </summary>
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var users = (await _userService.GetAllUsersAsync()).ToList();
            var total = users.Count;

            var mapped = users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    id = u.Id.ToString(),
                    name = u.FullName,
                    email = u.Email,
                    phone = (string?)null,
                    city = (string?)null,
                    country = (string?)null,
                    address = (string?)null,
                    totalOrders = 0,
                    totalSpent = 0m,
                    createdAt = u.CreatedAt,
                    blocked = false
                })
                .ToList();

            var hasPaging = Request.Query.ContainsKey("page") || Request.Query.ContainsKey("pageSize");
            if (!hasPaging)
            {
                return Ok(mapped);
            }

            var pageData = mapped
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                data = pageData,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving customers", error = ex.Message });
        }
    }

    /// <summary>
    /// Detalhes de cliente
    /// </summary>
    [HttpGet("customers/{id}")]
    public async Task<IActionResult> GetCustomerById(Guid id)
    {
        try
        {
            var user = await _userService.GetUserAsync(id);
            return Ok(new
            {
                id = user.Id.ToString(),
                name = user.FullName,
                email = user.Email,
                blocked = false
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("customers/{id}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        try
        {
            var user = await _userService.GetUserAsync(id);
            user.FullName = request.Name;
            user.Email = request.Email;
            await _userService.UpdateUserAsync(user);
            return Ok(new { id = user.Id.ToString(), name = user.FullName, email = user.Email, blocked = request.Blocked });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPatch("customers/{id}")]
    public async Task<IActionResult> PatchCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        return await UpdateCustomer(id, request);
    }

    #endregion
}

/// <summary>Dados para atualizar estoque</summary>
public record UpdateStockRequest(int NewStock);
public record UpdateCustomerRequest(string Name, string Email, bool Blocked);
public record UpdateProductPatchRequest(string? Name, string? Description, decimal? Price, int? Stock, string? Category);
