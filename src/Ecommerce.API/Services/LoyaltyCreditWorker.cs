using Ecommerce.API.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class LoyaltyCreditWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;

    public LoyaltyCreditWorker(IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        var rate = _configuration.GetValue("Loyalty:CashbackRate", 0.02m);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var loyalty = scope.ServiceProvider.GetRequiredService<LoyaltyService>();

        var orders = await db.Orders
            .Where(o => o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Delivered)
            .Where(o => o.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            .ToListAsync(ct);

        foreach (var order in orders)
        {
            await loyalty.CreditForOrderAsync(order.UserId, order.Id, order.TotalAmount, rate);
        }
    }
}
