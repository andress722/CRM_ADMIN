namespace Ecommerce.API.Services;

public class DataRetentionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DataRetentionWorker> _logger;

    public DataRetentionWorker(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<DataRetentionWorker> logger)
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
                var service = scope.ServiceProvider.GetRequiredService<DataGovernanceService>();
                var days = _configuration.GetValue("DataRetention:AnalyticsDays", 180);
                var removed = await service.PurgeOldAnalyticsAsync(days, stoppingToken);
                if (removed > 0)
                {
                    _logger.LogInformation("Purged {Count} analytics events older than {Days} days", removed, days);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Data retention cycle failed");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
