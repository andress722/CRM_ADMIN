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
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(OrderService service, IRequestThrottleService throttle, ILogger<OrdersController> logger)
    {
        _service = service;
        _throttle = throttle;
        _logger = logger;
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
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
            if (!User.IsInRole("Admin") && order.UserId != currentUserId)
            {
                _logger.LogWarning(
                    "Order access forbidden. CorrelationId={CorrelationId} OrderId={OrderId} CurrentUserId={CurrentUserId} OrderUserId={OrderUserId}",
                    GetCorrelationId(),
                    id,
                    currentUserId,
                    order.UserId);
                return Forbid();
            }
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "Order not found. CorrelationId={CorrelationId} OrderId={OrderId}",
                GetCorrelationId(),
                id);
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
            _logger.LogWarning(
                ex,
                "Track order not found. CorrelationId={CorrelationId} OrderId={OrderId}",
                GetCorrelationId(),
                id);
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
        var correlationId = GetCorrelationId();
        var currentUserId = GetCurrentUserId();

        try
        {
            if (currentUserId == Guid.Empty)
            {
                _logger.LogWarning(
                    "CreateOrder unauthorized. CorrelationId={CorrelationId}",
                    correlationId);
                return Unauthorized(new { message = "Invalid user" });
            }

            if (!_throttle.IsAllowed("orders:create:user", currentUserId.ToString(), 8, TimeSpan.FromMinutes(1)))
            {
                _logger.LogWarning(
                    "CreateOrder throttled. CorrelationId={CorrelationId} UserId={UserId}",
                    correlationId,
                    currentUserId);
                return StatusCode(429, new { message = "Too many order attempts. Please wait." });
            }

            var order = await _service.CreateOrderAsync(currentUserId, request.Items);
            _logger.LogInformation(
                "CreateOrder success. CorrelationId={CorrelationId} UserId={UserId} OrderId={OrderId} ItemCount={ItemCount} TotalAmount={TotalAmount}",
                correlationId,
                currentUserId,
                order.Id,
                order.Items.Count,
                order.TotalAmount);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "CreateOrder product not found. CorrelationId={CorrelationId} UserId={UserId}",
                correlationId,
                currentUserId);
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(
                ex,
                "CreateOrder validation error. CorrelationId={CorrelationId} UserId={UserId}",
                correlationId,
                currentUserId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "CreateOrder unexpected error. CorrelationId={CorrelationId} UserId={UserId}",
                correlationId,
                currentUserId);
            return StatusCode(500, new { message = "Failed to create order" });
        }
    }

    /// <summary>
    /// Cria pedido a partir do carrinho do usuário
    /// </summary>
    [HttpPost("from-cart")]
    public async Task<IActionResult> CreateOrderFromCart([FromBody] CreateOrderFromCartRequest? request)
    {
        var correlationId = GetCorrelationId();
        var currentUserId = GetCurrentUserId();
        var couponCode = request?.CouponCode?.Trim();

        try
        {
            if (currentUserId == Guid.Empty)
            {
                _logger.LogWarning(
                    "CreateOrderFromCart unauthorized. CorrelationId={CorrelationId}",
                    correlationId);
                return Unauthorized(new { message = "Invalid user" });
            }

            if (!_throttle.IsAllowed("orders:create-from-cart:user", currentUserId.ToString(), 8, TimeSpan.FromMinutes(1)))
            {
                _logger.LogWarning(
                    "CreateOrderFromCart throttled. CorrelationId={CorrelationId} UserId={UserId}",
                    correlationId,
                    currentUserId);
                return StatusCode(429, new { message = "Too many checkout attempts. Please wait." });
            }

            var order = await _service.CreateOrderFromCartAsync(currentUserId, couponCode);
            _logger.LogInformation(
                "CreateOrderFromCart success. CorrelationId={CorrelationId} UserId={UserId} OrderId={OrderId} CouponCode={CouponCode} ItemCount={ItemCount} TotalAmount={TotalAmount}",
                correlationId,
                currentUserId,
                order.Id,
                string.IsNullOrWhiteSpace(couponCode) ? "(none)" : couponCode,
                order.Items.Count,
                order.TotalAmount);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(
                ex,
                "CreateOrderFromCart validation error. CorrelationId={CorrelationId} UserId={UserId} CouponCode={CouponCode}",
                correlationId,
                currentUserId,
                string.IsNullOrWhiteSpace(couponCode) ? "(none)" : couponCode);
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "CreateOrderFromCart dependency not found. CorrelationId={CorrelationId} UserId={UserId} CouponCode={CouponCode}",
                correlationId,
                currentUserId,
                string.IsNullOrWhiteSpace(couponCode) ? "(none)" : couponCode);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "CreateOrderFromCart unexpected error. CorrelationId={CorrelationId} UserId={UserId} CouponCode={CouponCode}",
                correlationId,
                currentUserId,
                string.IsNullOrWhiteSpace(couponCode) ? "(none)" : couponCode);
            return StatusCode(500, new { message = "Failed to create order from cart" });
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
            _logger.LogWarning(
                ex,
                "UpdateOrderStatus order not found. CorrelationId={CorrelationId} OrderId={OrderId}",
                GetCorrelationId(),
                id);
            return NotFound(new { message = ex.Message });
        }
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var userId) ? userId : Guid.Empty;
    }

    private string GetCorrelationId()
    {
        return HttpContext.Response.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? HttpContext.TraceIdentifier;
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

public record CreateOrderFromCartRequest(string? CouponCode);
