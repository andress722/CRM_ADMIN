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

    public LegacyAdminController(IPaymentRepository payments)
    {
        _payments = payments;
    }

    [HttpGet("abandoned-carts")]
    public IActionResult GetAbandonedCarts()
        => StatusCode(StatusCodes.Status410Gone, new
        {
            message = "Legacy endpoint disabled.",
            replacement = "/api/v1/admin/reports"
        });

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
    public IActionResult GetReviews()
        => StatusCode(StatusCodes.Status410Gone, new
        {
            message = "Legacy endpoint disabled.",
            replacement = "/api/v1/admin/reviews"
        });
}

