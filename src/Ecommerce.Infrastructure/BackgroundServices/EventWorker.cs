using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.BackgroundServices;

public class EventWorker : BackgroundService
{
    private static readonly TimeSpan IdlePollMinDelay = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan IdlePollMaxDelay = TimeSpan.FromSeconds(30);

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
        var emptyPollStreak = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<Ecommerce.Infrastructure.Data.EcommerceDbContext>();
                var ev = await db.EventStore
                    .Where(e => e.Status == "pending")
                    .OrderBy(e => e.CreatedAt)
                    .FirstOrDefaultAsync(stoppingToken);

                if (ev == null)
                {
                    emptyPollStreak++;
                    var delay = ComputeIdleDelay(emptyPollStreak);

                    if (emptyPollStreak == 1 || emptyPollStreak % 10 == 0)
                    {
                        _logger.LogDebug(
                            "EventWorker queue is empty. Poll streak={PollStreak}, next delay={DelayMs}ms",
                            emptyPollStreak,
                            delay.TotalMilliseconds);
                    }

                    await Task.Delay(delay, stoppingToken);
                    continue;
                }

                emptyPollStreak = 0;
                _logger.LogInformation("Processing event {EventId} type {EventType}", ev.Id, ev.EventType);

                if (ev.EventType == "PurchaseCompleted")
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(ev.Payload);
                        _logger.LogInformation("PurchaseCompleted payload: {Payload}", ev.Payload);

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
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }

        _logger.LogInformation("EventWorker stopping");
    }

    private static TimeSpan ComputeIdleDelay(int emptyPollStreak)
    {
        var exponent = Math.Min(emptyPollStreak - 1, 5);
        var delayMs = IdlePollMinDelay.TotalMilliseconds * Math.Pow(2, exponent);
        return TimeSpan.FromMilliseconds(Math.Min(delayMs, IdlePollMaxDelay.TotalMilliseconds));
    }
}
