using System.Text.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public interface IAuditLogService
{
    Task WriteAsync(Guid? actorUserId, string actorEmail, string action, string entityType, string? entityId, object? metadata, string? ipAddress, string? userAgent, CancellationToken ct = default);
    Task<IReadOnlyList<AuditLog>> ListAsync(int take, CancellationToken ct = default);
}

public class AuditLogService : IAuditLogService
{
    private readonly EcommerceDbContext _db;

    public AuditLogService(EcommerceDbContext db)
    {
        _db = db;
    }

    public async Task WriteAsync(Guid? actorUserId, string actorEmail, string action, string entityType, string? entityId, object? metadata, string? ipAddress, string? userAgent, CancellationToken ct = default)
    {
        var item = new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            MetadataJson = JsonSerializer.Serialize(metadata ?? new { }),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        await _db.AuditLogs.AddAsync(item, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AuditLog>> ListAsync(int take, CancellationToken ct = default)
    {
        var clamped = Math.Max(1, Math.Min(500, take));
        return await _db.AuditLogs
            .OrderByDescending(x => x.CreatedAt)
            .Take(clamped)
            .ToListAsync(ct);
    }
}
