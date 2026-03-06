using System.Text.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
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
                        await using var tx = await db.Database.BeginTransactionAsync(stoppingToken);

                        var payload = JsonSerializer.Deserialize<PurchaseCompletedPayload>(ev.Payload);
                        if (payload == null)
                        {
                            throw new JsonException("PurchaseCompleted payload is empty or invalid.");
                        }

                        var webhookService = scope.ServiceProvider.GetService<WebhookService>();
                        if (webhookService != null)
                        {
                            await webhookService.PublishAsync(ev.EventType, ev.Payload);
                        }

                        var inventoryService = scope.ServiceProvider.GetService<InventoryService>();
                        if (inventoryService != null)
                        {
                            foreach (var item in payload.Items ?? Enumerable.Empty<PurchaseCompletedItem>())
                            {
                                if (item.ProductId == Guid.Empty || item.Quantity <= 0)
                                {
                                    continue;
                                }

                                await inventoryService.AdjustAsync(
                                    item.ProductId,
                                    -item.Quantity,
                                    $"PurchaseCompleted:{payload.PurchaseId}");
                            }
                        }

                        var userRepository = scope.ServiceProvider.GetService<IUserRepository>();
                        var emailService = scope.ServiceProvider.GetService<IEmailService>();
                        if (emailService != null && userRepository != null && payload.UserId != Guid.Empty)
                        {
                            var user = await userRepository.GetByIdAsync(payload.UserId);
                            if (user != null)
                            {
                                var itemSummary = string.Join(", ", (payload.Items ?? new List<PurchaseCompletedItem>())
                                    .Where(i => i.Quantity > 0)
                                    .Select(i => $"{i.Quantity}x {i.ProductId}"));

                                await emailService.SendCustomEmailAsync(
                                    user.Email,
                                    "Pedido confirmado",
                                    $"<p>Seu pedido <strong>{payload.PurchaseId}</strong> foi processado com sucesso.</p><p>Itens: {itemSummary}</p>",
                                    $"Seu pedido {payload.PurchaseId} foi processado com sucesso. Itens: {itemSummary}");
                            }
                        }

                        db.AuditLogs.Add(new AuditLog
                        {
                            Id = Guid.NewGuid(),
                            ActorUserId = null,
                            ActorEmail = "event-worker@system",
                            Action = "PurchaseCompletedHandled",
                            EntityType = "EventStore",
                            EntityId = ev.Id.ToString(),
                            MetadataJson = JsonSerializer.Serialize(new
                            {
                                payload.PurchaseId,
                                payload.UserId,
                                ItemCount = payload.Items?.Count ?? 0
                            }),
                            CreatedAt = DateTime.UtcNow
                        });

                        ev.Status = "processed";
                        ev.ProcessedAt = DateTime.UtcNow;

                        await db.SaveChangesAsync(stoppingToken);
                        await tx.CommitAsync(stoppingToken);
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

    private sealed class PurchaseCompletedPayload
    {
        public Guid PurchaseId { get; set; }
        public Guid UserId { get; set; }
        public decimal Amount { get; set; }
        public List<PurchaseCompletedItem>? Items { get; set; }
    }

    private sealed class PurchaseCompletedItem
    {
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
    }
}
