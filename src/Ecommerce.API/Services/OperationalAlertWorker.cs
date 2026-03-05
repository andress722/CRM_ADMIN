using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class OperationalAlertWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OperationalAlertWorker> _logger;

    public OperationalAlertWorker(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<OperationalAlertWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OperationalAlertWorker failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var recipients = (_configuration["Alerts:EmailRecipients"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
        if (recipients.Count == 0)
        {
            return;
        }

        var since = DateTime.UtcNow.AddHours(-24);
        var orders = await db.Orders.Include(o => o.Items).Where(x => x.CreatedAt >= since).ToListAsync(ct);
        var events = await db.AnalyticsEvents.Where(x => x.CreatedAt >= since).ToListAsync(ct);

        var totalOrders = orders.Count;
        var cancelled = orders.Count(x => x.Status == OrderStatus.Cancelled);
        var cancelRate = totalOrders == 0 ? 0m : (decimal)cancelled / totalOrders;

        var addToCart = events.Where(x => x.Type == "AddToCart").Sum(x => x.Value ?? 1);
        var soldQty = orders.Where(x => x.Status != OrderStatus.Cancelled).SelectMany(x => x.Items).Sum(i => i.Quantity);
        var conversion = addToCart > 0 ? soldQty / addToCart : 0m;

        var cancelThreshold = _configuration.GetValue("Alerts:CancelRateThreshold", 0.20m);
        var conversionThreshold = _configuration.GetValue("Alerts:CartConversionThreshold", 0.15m);

        if (cancelRate < cancelThreshold && conversion >= conversionThreshold)
        {
            return;
        }

        var subject = $"[ALERT] Ecommerce operation - {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
        var html = $"<h3>Operational alert</h3><p>Cancel rate: {cancelRate:P2}</p><p>Cart conversion: {conversion:P2}</p>";
        var text = $"Operational alert\nCancel rate: {cancelRate:P2}\nCart conversion: {conversion:P2}";

        foreach (var email in recipients)
        {
            await emailService.SendCustomEmailAsync(email, subject, html, text);
        }
    }
}
