using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.API.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador para gerenciar pedidos
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _service;
    private readonly IRequestThrottleService _throttle;

    public OrdersController(OrderService service, IRequestThrottleService throttle)
    {
        _service = service;
        _throttle = throttle;
    }

    /// <summary>
    /// Obtém um pedido por ID
    /// </summary>
    /// <param name="id">ID do pedido</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        try
        {
            var order = await _service.GetOrderAsync(id);
            // Allow owner or admin to view order
            var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
            if (!User.IsInRole("Admin") && order.UserId != currentUserId)
            {
                return Forbid();
            }
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Public tracking summary for an order
    /// </summary>
    [HttpGet("track/{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackOrder(Guid id)
    {
        try
        {
            var order = await _service.GetOrderAsync(id);
            return Ok(new
            {
                id = order.Id,
                status = order.Status,
                createdAt = order.CreatedAt,
                updatedAt = order.UpdatedAt,
                totalAmount = order.TotalAmount,
                itemCount = order.Items.Count
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lista pedidos de um usuário
    /// </summary>
    /// <param name="userId">ID do usuário</param>
    [HttpGet("user/{userId}")]
    [Authorize(Policy = "OwnerOrAdmin")]
    public async Task<IActionResult> GetUserOrders(Guid userId)
    {
        var orders = await _service.GetUserOrdersAsync(userId);
        return Ok(orders);
    }

    /// <summary>
    /// Cria um novo pedido
    /// </summary>
    /// <param name="request">Dados do pedido</param>
    [HttpPost]
    public async Task<IActionResult> CreateOrder(CreateOrderRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == Guid.Empty)
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            if (!_throttle.IsAllowed("orders:create:user", currentUserId.ToString(), 8, TimeSpan.FromMinutes(1)))
            {
                return StatusCode(429, new { message = "Too many order attempts. Please wait." });
            }

            var order = await _service.CreateOrderAsync(
                currentUserId,
                request.Items
            );
            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
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

    /// <summary>
    /// Cria pedido a partir do carrinho do usuário
    /// </summary>
    [HttpPost("from-cart")]
    public async Task<IActionResult> CreateOrderFromCart()
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == Guid.Empty)
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            if (!_throttle.IsAllowed("orders:create-from-cart:user", currentUserId.ToString(), 8, TimeSpan.FromMinutes(1)))
            {
                return StatusCode(429, new { message = "Too many checkout attempts. Please wait." });
            }

            var order = await _service.CreateOrderFromCartAsync(currentUserId);
            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza status do pedido
    /// </summary>
    /// <param name="id">ID do pedido</param>
    /// <param name="request">Novo status</param>
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, UpdateOrderStatusRequest request)
    {
        try
        {
            var order = await _service.UpdateOrderStatusAsync(id, request.Status);
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var userId) ? userId : Guid.Empty;
    }
}

/// <summary>Dados para criar um pedido</summary>
public record CreateOrderRequest(
    List<(Guid ProductId, int Quantity)> Items
);

/// <summary>Dados para atualizar status do pedido</summary>
public record UpdateOrderStatusRequest(
    OrderStatus Status
);





