using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Middleware;

public sealed class RequestBodySizeLimitMiddleware
{
    private readonly RequestDelegate _next;

    private const long DefaultLimitBytes = 256 * 1024; // 256 KB
    private const long AuthLimitBytes = 64 * 1024; // 64 KB
    private const long PaymentsLimitBytes = 128 * 1024; // 128 KB
    private const long WebhookLimitBytes = 512 * 1024; // 512 KB
    private const long UploadLimitBytes = 10 * 1024 * 1024; // 10 MB

    public RequestBodySizeLimitMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        if (RequiresBodyLimitCheck(context.Request.Method))
        {
            var maxAllowed = ResolveLimit(context.Request.Path);
            var contentLength = context.Request.ContentLength;

            if (contentLength.HasValue && contentLength.Value > maxAllowed)
            {
                context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status413PayloadTooLarge,
                    Title = "Payload too large",
                    Detail = $"Request payload exceeds the limit of {maxAllowed} bytes for this endpoint."
                });
                return;
            }
        }

        await _next(context);
    }

    private static bool RequiresBodyLimitCheck(string method)
    {
        return HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method);
    }

    private static long ResolveLimit(PathString path)
    {
        if (path.StartsWithSegments("/api/v1/auth", StringComparison.OrdinalIgnoreCase))
        {
            return AuthLimitBytes;
        }

        if (path.StartsWithSegments("/api/v1/payments", StringComparison.OrdinalIgnoreCase))
        {
            return PaymentsLimitBytes;
        }

        if (path.StartsWithSegments("/api/v1/subscriptions/billing-webhook", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/api/webhooks", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/api/v1/shipping/webhook", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/api/v1/emailwebhook", StringComparison.OrdinalIgnoreCase))
        {
            return WebhookLimitBytes;
        }

        if (path.StartsWithSegments("/api/v1/admin/product-images", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/api/v1/products", StringComparison.OrdinalIgnoreCase))
        {
            return UploadLimitBytes;
        }

        return DefaultLimitBytes;
    }
}
