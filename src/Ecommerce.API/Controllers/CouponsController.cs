using Ecommerce.Application.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/[controller]")]
public class CouponsController : ControllerBase
{
    private readonly ICouponRepository _couponRepository;

    public CouponsController(ICouponRepository couponRepository)
    {
        _couponRepository = couponRepository;
    }

    [HttpGet("validate")]
    public async Task<IActionResult> Validate([FromQuery] string? code)
    {
        var normalized = (code ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return BadRequest(new { message = "Coupon code is required" });
        }

        var coupon = (await _couponRepository.GetAllAsync())
            .FirstOrDefault(c => c.Active && c.Code.Trim().ToUpperInvariant() == normalized);

        if (coupon == null)
        {
            return NotFound(new { message = "Coupon not found or inactive" });
        }

        var discount = Math.Clamp(coupon.Discount, 0m, 100m);
        return Ok(new
        {
            code = coupon.Code,
            discount,
            active = coupon.Active,
        });
    }
}
