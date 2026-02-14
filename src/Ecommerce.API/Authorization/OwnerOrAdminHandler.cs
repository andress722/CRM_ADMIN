using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Ecommerce.API.Authorization;

public class OwnerOrAdminHandler : AuthorizationHandler<OwnerOrAdminRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, OwnerOrAdminRequirement requirement)
    {
        if (context.User == null)
        {
            return Task.CompletedTask;
        }

        // Admins pass
        var role = context.User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Try to get http context route data for userId parameter
        if (context.Resource is HttpContext http)
        {
            var route = http.GetRouteData();
            if (route.Values.TryGetValue("userId", out var userIdObj) && userIdObj != null)
            {
                if (Guid.TryParse(userIdObj.ToString(), out var userId))
                {
                    var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub");
                    if (!string.IsNullOrWhiteSpace(sub) && Guid.TryParse(sub, out var currentUserId) && currentUserId == userId)
                    {
                        context.Succeed(requirement);
                    }
                }
            }
        }

        return Task.CompletedTask;
    }
}
