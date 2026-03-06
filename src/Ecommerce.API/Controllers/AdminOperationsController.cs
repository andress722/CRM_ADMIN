using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public class AdminOperationsController : ControllerBase
{
    private readonly IPaymentRepository _payments;
    private readonly ICartRepository _carts;
    private readonly IOrderRepository _orders;
    private readonly IProductRepository _products;
    private readonly IUserRepository _users;
    private readonly EcommerceDbContext _db;

    private static readonly HashSet<string> _recoveredCarts = new(StringComparer.OrdinalIgnoreCase);

    public AdminOperationsController(
        IPaymentRepository payments,
        ICartRepository carts,
        IOrderRepository orders,
        IProductRepository products,
        IUserRepository users,
        EcommerceDbContext db)
    {
        _payments = payments;
        _carts = carts;
        _orders = orders;
        _products = products;
        _users = users;
        _db = db;
    }

    [HttpGet("abandoned-carts")]
    public async Task<IActionResult> GetAbandonedCarts()
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);
        var cartItems = (await _carts.GetAllAsync())
            .Where(c => c.AddedAt <= cutoff)
            .ToList();

        var usersById = (await _users.GetAllAsync()).ToDictionary(u => u.Id);
        var productsById = (await _products.GetAllAsync()).ToDictionary(p => p.Id);
        var orders = (await _orders.GetAllAsync()).ToList();

        var result = cartItems
            .GroupBy(c => c.UserId)
            .Select(group =>
            {
                var hasRecoveryOrder = orders.Any(o => o.UserId == group.Key && o.CreatedAt >= group.Max(x => x.AddedAt));
                var cartId = group.Key.ToString();

                return new AbandonedCartDto(
                    cartId,
                    usersById.TryGetValue(group.Key, out var user) ? user.FullName : "Cliente",
                    usersById.TryGetValue(group.Key, out user) ? user.Email : string.Empty,
                    group.GroupBy(x => x.ProductId)
                        .Select(g => new AbandonedCartItemDto(
                            g.Key.ToString(),
                            productsById.TryGetValue(g.Key, out var product) ? product.Name : "Produto",
                            g.Sum(i => i.Quantity)))
                        .ToList(),
                    group.Max(x => x.AddedAt).ToString("s"),
                    hasRecoveryOrder || _recoveredCarts.Contains(cartId) ? "Recuperado" : "Pendente");
            })
            .OrderByDescending(x => x.LastUpdated)
            .Take(200)
            .ToList();

        return Ok(result);
    }

    [HttpPost("abandoned-carts/{id}/recover")]
    public IActionResult RecoverAbandonedCart(string id)
    {
        _recoveredCarts.Add(id);
        return Ok(new { id, status = "recovery_sent" });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments()
    {
        var data = (await _payments.GetAllAsync())
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                id = p.Id.ToString(),
                orderId = p.OrderId.ToString(),
                method = p.Method.ToString(),
                status = p.Status.ToString(),
                amount = p.Amount,
                createdAt = p.CreatedAt.ToString("s"),
                webhookStatus = p.Status == PaymentStatus.Captured ? "ok" : "pending"
            });

        return Ok(data);
    }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews()
    {
        var reviews = await _db.Reviews
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync();

        var productsById = (await _products.GetAllAsync()).ToDictionary(p => p.Id);
        var usersById = (await _users.GetAllAsync()).ToDictionary(u => u.Id);

        var data = reviews.Select(r => new ReviewAdminDto(
            r.Id.ToString(),
            r.ProductId.ToString(),
            productsById.TryGetValue(r.ProductId, out var product) ? product.Name : "Produto",
            usersById.TryGetValue(r.UserId, out var user) ? user.FullName : "Cliente",
            r.Rating,
            r.Content,
            r.Status,
            r.CreatedAt.ToString("s")));

        return Ok(data);
    }

    [HttpGet("rma")]
    public async Task<IActionResult> GetRma()
    {
        var data = await _db.Refunds
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new RmaCaseDto(
                x.Id.ToString(),
                x.OrderId.ToString(),
                x.Reason,
                x.Status,
                x.CreatedAt.ToString("s")))
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("reconciliation")]
    public async Task<IActionResult> GetReconciliation()
    {
        var payments = (await _payments.GetAllAsync()).ToList();
        var ordersById = (await _orders.GetAllAsync()).ToDictionary(o => o.Id);

        var data = payments
            .OrderByDescending(p => p.CreatedAt)
            .Take(300)
            .Select(p =>
            {
                ordersById.TryGetValue(p.OrderId, out var order);
                var orderAmount = order?.TotalAmount ?? 0m;
                var isMatched = order != null
                    && orderAmount == p.Amount
                    && p.Status != PaymentStatus.Failed
                    && order.Status != OrderStatus.Cancelled;

                return new
                {
                    id = p.Id.ToString(),
                    orderId = p.OrderId.ToString(),
                    paymentId = p.Id.ToString(),
                    orderAmount,
                    paymentAmount = p.Amount,
                    status = isMatched ? "Conciliado" : "Divergente",
                    createdAt = p.CreatedAt.ToString("s")
                };
            })
            .ToList();

        return Ok(data);
    }

    [HttpGet("reservations")]
    public async Task<IActionResult> GetReservations()
    {
        var orders = (await _orders.GetAllAsync())
            .OrderByDescending(o => o.CreatedAt)
            .Take(300)
            .ToList();

        var reservations = orders
            .SelectMany(order => order.Items.Select(item => new
            {
                id = item.Id.ToString(),
                orderId = order.Id.ToString(),
                productId = item.ProductId.ToString(),
                quantity = item.Quantity,
                status = order.Status switch
                {
                    OrderStatus.Cancelled => "Cancelado",
                    OrderStatus.Shipped or OrderStatus.Delivered => "Liberado",
                    _ => "Reservado"
                },
                createdAt = order.CreatedAt.ToString("s")
            }))
            .ToList();

        return Ok(reservations);
    }

    [HttpGet("packing")]
    public async Task<IActionResult> GetPacking()
    {
        var productsById = (await _products.GetAllAsync()).ToDictionary(p => p.Id);
        var orders = (await _orders.GetAllAsync())
            .OrderByDescending(o => o.CreatedAt)
            .Take(300)
            .ToList();

        var result = orders.Select(order => new
        {
            id = order.Id.ToString(),
            orderId = order.Id.ToString(),
            items = order.Items.Select(i => new
            {
                productId = i.ProductId.ToString(),
                name = productsById.TryGetValue(i.ProductId, out var product) ? product.Name : "Produto",
                quantity = i.Quantity
            }),
            status = order.Status switch
            {
                OrderStatus.Pending or OrderStatus.Confirmed => "Pendente",
                OrderStatus.Processing => "Pronto",
                OrderStatus.Shipped or OrderStatus.Delivered => "Enviado",
                _ => "Pendente"
            },
            createdAt = order.CreatedAt.ToString("s")
        });

        return Ok(result);
    }

    [HttpGet("logistics")]
    public async Task<IActionResult> GetLogistics()
    {
        var shipments = await _db.Shipments
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new
            {
                id = x.Id.ToString(),
                orderId = x.OrderId.ToString(),
                provider = x.Provider,
                service = x.Service,
                trackingNumber = x.TrackingNumber,
                status = x.Status,
                createdAt = x.CreatedAt.ToString("s"),
                updatedAt = x.UpdatedAt.ToString("s")
            })
            .ToListAsync();

        return Ok(shipments);
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements()
    {
        var movements = await _db.InventoryMovements
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(300)
            .Select(x => new
            {
                id = x.Id.ToString(),
                productId = x.ProductId.ToString(),
                type = x.QuantityAfter > x.QuantityBefore
                    ? "Entrada"
                    : x.QuantityAfter < x.QuantityBefore
                        ? "Saída"
                        : "Ajuste",
                quantity = Math.Abs(x.QuantityAfter - x.QuantityBefore),
                warehouse = "Principal",
                reason = x.Reason,
                createdAt = x.CreatedAt.ToString("s")
            })
            .ToListAsync();

        return Ok(movements);
    }

    [HttpGet("seo-search")]
    public async Task<IActionResult> GetSeoSearch()
    {
        var searchEvents = await _db.AnalyticsEvents
            .AsNoTracking()
            .Where(x => x.Type == "Search" || x.Type == "SeoSearch")
            .OrderByDescending(x => x.CreatedAt)
            .Take(2000)
            .ToListAsync();

        if (searchEvents.Count > 0)
        {
            var data = searchEvents
                .GroupBy(x => string.IsNullOrWhiteSpace(x.Label) ? x.Action : x.Label)
                .Select(g => new
                {
                    term = g.Key,
                    hits = g.Count(),
                    conversions = g.Count(x => x.Category == "Checkout"),
                    updatedAt = g.Max(x => x.CreatedAt).ToString("s")
                })
                .OrderByDescending(x => x.hits)
                .Take(100)
                .ToList();

            return Ok(data);
        }

        var fallback = (await _products.GetAllAsync())
            .OrderByDescending(p => p.ViewCount)
            .Take(100)
            .Select(p => new
            {
                term = p.Name,
                hits = p.ViewCount,
                conversions = 0,
                updatedAt = (p.UpdatedAt ?? p.CreatedAt).ToString("s")
            })
            .ToList();

        return Ok(fallback);
    }

    public record AbandonedCartDto(
        string Id,
        string CustomerName,
        string Email,
        List<AbandonedCartItemDto> Items,
        string LastUpdated,
        string RecoveryStatus
    );

    public record AbandonedCartItemDto(string ProductId, string Name, int Quantity);

    public record ReviewAdminDto(
        string Id,
        string ProductId,
        string ProductName,
        string CustomerName,
        int Rating,
        string Comment,
        string Status,
        string CreatedAt
    );

    public record RmaCaseDto(
        string Id,
        string OrderId,
        string Reason,
        string Status,
        string CreatedAt
    );
}
