using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.API.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/ops")]
public class AdminOpsController : ControllerBase
{
    private readonly MetricsRegistry _metrics;
    private readonly DataGovernanceService _governance;

    public AdminOpsController(MetricsRegistry metrics, DataGovernanceService governance)
    {
        _metrics = metrics;
        _governance = governance;
    }

    [HttpGet("slo")]
    public IActionResult GetSloSnapshot()
    {
        return Ok(_metrics.Snapshot());
    }

    [HttpGet("backup-status")]
    public IActionResult GetBackupStatus()
    {
        var result = _governance.CheckBackupHealth();
        return Ok(new { healthy = result.healthy, message = result.message });
    }
}
