using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/lgpd")]
public class LgpdController : ControllerBase
{
    [HttpPost("export")]
    public IActionResult Export()
    {
        return Ok(new { status = "export_queued" });
    }

    [HttpPost("anonymize")]
    public IActionResult Anonymize()
    {
        return Ok(new { status = "anonymize_queued" });
    }
}
