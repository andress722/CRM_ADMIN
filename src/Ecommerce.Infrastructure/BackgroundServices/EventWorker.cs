using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.BackgroundServices;

public class EventWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<EventWorker> _logger;

    public EventWorker(IServiceProvider services, ILogger<EventWorker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EventWorker started");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<Ecommerce.Infrastructure.Data.EcommerceDbContext>();
                var ev = await db.EventStore.Where(e => e.Status == "pending").OrderBy(e => e.CreatedAt).FirstOrDefaultAsync(stoppingToken);
                if (ev == null)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                _logger.LogInformation("Processing event {EventId} type {EventType}", ev.Id, ev.EventType);

                // Processing: handle PurchaseCompleted by publishing to webhooks and marking processed
                if (ev.EventType == "PurchaseCompleted")
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(ev.Payload);
                        _logger.LogInformation("PurchaseCompleted payload: {Payload}", ev.Payload);

                        // Publish to configured webhooks (if any)
                        var webhookService = scope.ServiceProvider.GetService<Ecommerce.Application.Services.WebhookService>();
                        if (webhookService != null)
                        {
                            await webhookService.PublishAsync(ev.EventType, ev.Payload);
                        }

                        // TODO: extend: update inventory, send emails/SignalR notifications

                        ev.Status = "processed";
                        ev.ProcessedAt = DateTime.UtcNow;
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Invalid JSON payload for event {EventId}", ev.Id);
                        ev.Attempts++;
                        if (ev.Attempts >= 5) ev.Status = "dead_letter";
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed processing PurchaseCompleted for event {EventId}", ev.Id);
                        ev.Attempts++;
                        if (ev.Attempts >= 5) ev.Status = "dead_letter";
                    }
                }
                else
                {
                    _logger.LogWarning("Unknown event type {EventType} for event {EventId}", ev.EventType, ev.Id);
                    ev.Attempts++;
                    if (ev.Attempts >= 5) ev.Status = "dead_letter";
                }

                await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "EventWorker encountered an error");
                await Task.Delay(2000, stoppingToken);
            }
        }
        _logger.LogInformation("EventWorker stopping");
    }
}
