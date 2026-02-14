using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Repositories;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/email/logs")]
public class EmailLogsController : ControllerBase
{
    private readonly IEmailLogRepository _logs;

    public EmailLogsController(IEmailLogRepository logs)
        => _logs = logs;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int take = 50)
    {
        var logs = await _logs.GetRecentAsync(Math.Clamp(take, 1, 200));
        return Ok(logs);
    }
}
