using Ecommerce.Application.Services;

namespace Ecommerce.API.Services;

public class SubscriptionRecurringBillingWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SubscriptionRecurringBillingWorker> _logger;

    public SubscriptionRecurringBillingWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<SubscriptionRecurringBillingWorker> logger)
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
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<SubscriptionService>();
                var batchSize = Math.Max(1, _configuration.GetValue("Subscriptions:Billing:WorkerBatchSize", 100));
                var result = await service.ProcessDueBillingsAsync(batchSize);

                if (result.Processed > 0)
                {
                    _logger.LogInformation(
                        "Subscription recurring billing run completed. processed={Processed} succeeded={Succeeded} failed={Failed}",
                        result.Processed,
                        result.Succeeded,
                        result.Failed);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Subscription recurring billing worker execution failed.");
            }

            var intervalMinutes = Math.Max(1, _configuration.GetValue("Subscriptions:Billing:WorkerIntervalMinutes", 10));
            await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
        }
    }
}
