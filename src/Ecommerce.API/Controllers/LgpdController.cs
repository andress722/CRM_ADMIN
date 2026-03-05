using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.API.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/lgpd")]
public class LgpdController : ControllerBase
{
    private readonly DataGovernanceService _service;

    public LgpdController(DataGovernanceService service)
    {
        _service = service;
    }

    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] LgpdUserRequest request)
    {
        var json = await _service.ExportUserDataAsync(request.UserId);
        return Ok(new { status = "export_ready", data = json });
    }

    [HttpPost("anonymize")]
    public async Task<IActionResult> Anonymize([FromBody] LgpdUserRequest request)
    {
        await _service.AnonymizeUserDataAsync(request.UserId);
        return Ok(new { status = "anonymized", userId = request.UserId });
    }

    [HttpGet("backup-status")]
    public IActionResult BackupStatus()
    {
        var result = _service.CheckBackupHealth();
        return Ok(new { healthy = result.healthy, message = result.message });
    }
}

public record LgpdUserRequest(Guid UserId);

