using Ecommerce.Application.Services;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class AbandonedCartRecoveryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;

    public AbandonedCartRecoveryWorker(IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        if (!_configuration.GetValue("CartRecovery:Enabled", true))
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        var carts = await db.CartItems
            .Where(c => c.AddedAt <= now.AddHours(-1))
            .ToListAsync(ct);

        if (carts.Count == 0)
        {
            return;
        }

        var grouped = carts.GroupBy(c => c.UserId);
        foreach (var group in grouped)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == group.Key, ct);
            if (user == null || string.IsNullOrWhiteSpace(user.Email) || !user.MarketingEmailOptIn)
            {
                continue;
            }

            var maxAge = group.Max(c => now - c.AddedAt);
            var stage = maxAge.TotalHours >= 48 ? 3 : maxAge.TotalHours >= 24 ? 2 : 1;
            var marker = $"{user.Id}:stage{stage}:{now:yyyyMMdd}";

            var alreadySent = await db.AnalyticsEvents.AnyAsync(x => x.Type == "CartRecoveryEmailSent" && x.Label == marker, ct);
            if (alreadySent)
            {
                continue;
            }

            var subject = stage switch
            {
                3 => "Ultima chance: itens reservados no carrinho",
                2 => "Seu carrinho ainda esta te esperando",
                _ => "Voce deixou itens no carrinho"
            };

            var itemCount = group.Sum(x => x.Quantity);
            var html = $"<p>Voce tem {itemCount} item(ns) no carrinho.</p><p>Volte para concluir sua compra.</p>";
            var text = $"Voce tem {itemCount} item(ns) no carrinho. Volte para concluir sua compra.";

            await email.SendCustomEmailAsync(user.Email, subject, html, text);

            db.AnalyticsEvents.Add(new Ecommerce.Domain.Entities.AnalyticsEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Type = "CartRecoveryEmailSent",
                Category = "CartRecovery",
                Action = $"Stage{stage}",
                Label = marker,
                Value = stage,
                Url = "/cart",
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
