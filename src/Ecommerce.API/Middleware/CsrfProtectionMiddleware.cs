using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Middleware;

public sealed class CsrfProtectionMiddleware
{
    private const string CsrfCookieName = "csrf_token";
    private const string CsrfHeaderName = "X-CSRF-Token";
    private static readonly PathString[] ProtectedPaths =
    {
        new("/api/v1/auth/refresh"),
        new("/api/v1/auth/logout")
    };

    private readonly RequestDelegate _next;

    public CsrfProtectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        if (HttpMethods.IsPost(context.Request.Method) && IsProtectedPath(context.Request.Path))
        {
            var cookieToken = context.Request.Cookies[CsrfCookieName];
            var headerToken = context.Request.Headers[CsrfHeaderName].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(cookieToken) || string.IsNullOrWhiteSpace(headerToken) || !string.Equals(cookieToken, headerToken, StringComparison.Ordinal))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "CSRF validation failed",
                    Detail = "Missing or invalid CSRF token."
                });
                return;
            }
        }

        await _next(context);
    }

    private static bool IsProtectedPath(PathString requestPath)
    {
        foreach (var path in ProtectedPaths)
        {
            if (requestPath.Equals(path, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
