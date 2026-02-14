using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/webhooks")]
public class EmailWebhookController : ControllerBase
{
    [HttpPost("email")]
    public IActionResult ReceiveEmailEvents([FromBody] object payload)
    {
        return Ok(new { message = "Email event received" });
    }
}
