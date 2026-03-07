using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api")]
public class LegacyAdminController : ControllerBase
{
    private readonly IPaymentRepository _payments;

    private static readonly List<LegacyAbandonedCartDto> _abandonedCarts = new();
    private static readonly List<LegacyReviewDto> _reviews = new();

    public LegacyAdminController(IPaymentRepository payments)
    {
        _payments = payments;
    }

    [HttpGet("abandoned-carts")]
    public IActionResult GetAbandonedCarts() => Ok(_abandonedCarts);

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

    public record LegacyAbandonedCartDto(
        string Id,
        string CustomerName,
        string Email,
        List<LegacyAbandonedCartItemDto> Items,
        string LastUpdated,
        string RecoveryStatus
    );

    public record LegacyAbandonedCartItemDto(string ProductId, string Name, int Quantity);

    public record LegacyReviewDto(
        string Id,
        string ProductId,
        string ProductName,
        string CustomerName,
        int Rating,
        string Comment,
        string Status,
        string CreatedAt
    );
}


