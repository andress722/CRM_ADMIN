using Ecommerce.Application.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.API.Services;

public class AnalyticsAggregationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AnalyticsAggregationWorker> _logger;

    public AnalyticsAggregationWorker(IServiceScopeFactory scopeFactory, ILogger<AnalyticsAggregationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var analytics = scope.ServiceProvider.GetRequiredService<AnalyticsService>();
                var date = DateOnly.FromDateTime(DateTime.UtcNow.Date);
                await analytics.AggregateAsync(date);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Analytics aggregation failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        }
    }
}
