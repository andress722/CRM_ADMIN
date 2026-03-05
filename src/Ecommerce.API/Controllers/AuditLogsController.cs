using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.API.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/audit-logs")]
[Route("api/v1/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int take = 100)
    {
        var logs = await _auditLogService.ListAsync(take);
        return Ok(logs.Select(l => new
        {
            id = l.Id,
            userId = l.ActorUserId,
            action = l.Action,
            timestamp = l.CreatedAt,
            actorEmail = l.ActorEmail,
            entityType = l.EntityType,
            entityId = l.EntityId,
            metadata = l.MetadataJson,
            ipAddress = l.IpAddress
        }));
    }
}
