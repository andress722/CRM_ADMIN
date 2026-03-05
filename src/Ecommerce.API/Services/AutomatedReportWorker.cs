using Ecommerce.Application.Services;

namespace Ecommerce.API.Services;

public class AutomatedReportWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AutomatedReportWorker> _logger;

    public AutomatedReportWorker(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<AutomatedReportWorker> logger)
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
                _logger.LogWarning(ex, "AutomatedReportWorker failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        var recipients = (_configuration["Reports:EmailRecipients"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        if (recipients.Count == 0)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var reportService = scope.ServiceProvider.GetRequiredService<AdminReportService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        var report = await reportService.BuildOverviewAsync(now);

        var shouldSendDaily = now.Hour == _configuration.GetValue("Reports:DailyHourUtc", 8);
        var shouldSendWeekly = now.DayOfWeek == DayOfWeek.Monday && now.Hour == _configuration.GetValue("Reports:WeeklyHourUtc", 9);
        var shouldSendMonthly = now.Day == 1 && now.Hour == _configuration.GetValue("Reports:MonthlyHourUtc", 10);

        if (!shouldSendDaily && !shouldSendWeekly && !shouldSendMonthly)
        {
            return;
        }

        var subjectPrefix = shouldSendMonthly ? "Monthly" : shouldSendWeekly ? "Weekly" : "Daily";
        var subject = $"[{subjectPrefix}] Ecommerce performance report - {now:yyyy-MM-dd}";
        var html = reportService.BuildOverviewEmailHtml(report);
        var text = reportService.BuildOverviewEmailText(report);

        foreach (var email in recipients)
        {
            await emailService.SendCustomEmailAsync(email, subject, html, text);
        }
    }
}
