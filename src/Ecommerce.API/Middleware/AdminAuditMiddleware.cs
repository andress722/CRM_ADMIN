using System.IdentityModel.Tokens.Jwt;
using Ecommerce.API.Services;

namespace Ecommerce.API.Middleware;

public class AdminAuditMiddleware
{
    private static readonly HashSet<string> TrackedMethods = ["POST", "PUT", "PATCH", "DELETE"];

    private readonly RequestDelegate _next;

    public AdminAuditMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context, IAuditLogService auditLogService)
    {
        await _next(context);

        if (!TrackedMethods.Contains(context.Request.Method))
        {
            return;
        }

        if (!context.Request.Path.StartsWithSegments("/api/v1/admin", StringComparison.OrdinalIgnoreCase) &&
            !context.Request.Path.StartsWithSegments("/admin", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (!(context.User?.Identity?.IsAuthenticated ?? false) || !context.User.IsInRole("Admin"))
        {
            return;
        }

        if (context.Response.StatusCode >= 400)
        {
            return;
        }

        var sub = context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        Guid? actorId = Guid.TryParse(sub, out var id) ? id : null;
        var email = context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? string.Empty;

        var path = context.Request.Path.Value ?? string.Empty;
        var action = $"{context.Request.Method} {path}";
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var entityType = segments.Length >= 4 ? segments[3] : "admin";
        var entityId = segments.LastOrDefault();

        await auditLogService.WriteAsync(
            actorId,
            email,
            action,
            entityType,
            entityId,
            new { Query = context.Request.QueryString.Value },
            context.Connection.RemoteIpAddress?.ToString(),
            context.Request.Headers.UserAgent.ToString());
    }
}
