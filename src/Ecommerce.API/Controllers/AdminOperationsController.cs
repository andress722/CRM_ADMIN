using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public class AdminOperationsController : ControllerBase
{
    private readonly IPaymentRepository _payments;

    private static readonly List<AbandonedCartDto> _abandonedCarts = new();
    private static readonly List<ReviewAdminDto> _reviews = new();
    private static readonly List<RmaCaseDto> _rmaCases = new();

    public AdminOperationsController(IPaymentRepository payments)
    {
        _payments = payments;
    }

    [HttpGet("abandoned-carts")]
    public IActionResult GetAbandonedCarts() => Ok(_abandonedCarts);

    [HttpPost("abandoned-carts/{id}/recover")]
    public IActionResult RecoverAbandonedCart(string id)
    {
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
    public IActionResult GetReviews() => Ok(_reviews);

    [HttpGet("rma")]
    public IActionResult GetRma() => Ok(_rmaCases);

    [HttpGet("reconciliation")]
    public IActionResult GetReconciliation() => Ok(Array.Empty<object>());

    [HttpGet("reservations")]
    public IActionResult GetReservations() => Ok(Array.Empty<object>());

    [HttpGet("packing")]
    public IActionResult GetPacking() => Ok(Array.Empty<object>());

    [HttpGet("logistics")]
    public IActionResult GetLogistics() => Ok(Array.Empty<object>());

    [HttpGet("movements")]
    public IActionResult GetMovements() => Ok(Array.Empty<object>());

    [HttpGet("seo-search")]
    public IActionResult GetSeoSearch() => Ok(Array.Empty<object>());

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
