using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api")]
public class LegacyAdminController : ControllerBase
{
    [HttpGet("abandoned-carts")]
    public IActionResult GetAbandonedCarts()
        => StatusCode(StatusCodes.Status410Gone, new
        {
            message = "Legacy endpoint disabled.",
            replacement = "/api/v1/admin/reports"
        });

    [HttpGet("payments")]
    public IActionResult GetPayments()
        => StatusCode(StatusCodes.Status410Gone, new
        {
            message = "Legacy endpoint disabled.",
            replacement = "/api/v1/admin/payments"
        });

    [HttpGet("reviews")]
    public IActionResult GetReviews()
        => StatusCode(StatusCodes.Status410Gone, new
        {
            message = "Legacy endpoint disabled.",
            replacement = "/api/v1/admin/reviews"
        });
}
