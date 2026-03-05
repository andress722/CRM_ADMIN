using System.Text;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class PostSalesEngagementWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PostSalesEngagementWorker(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var productService = scope.ServiceProvider.GetRequiredService<ProductService>();

        var now = DateTime.UtcNow;
        var delivered = await db.Orders.Include(o => o.Items)
            .Where(o => o.Status == OrderStatus.Delivered)
            .Where(o => o.CreatedAt <= now.AddDays(-7))
            .ToListAsync(ct);

        foreach (var order in delivered)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == order.UserId, ct);
            if (user == null || string.IsNullOrWhiteSpace(user.Email))
            {
                continue;
            }

            var npsMarker = $"NPS:{order.Id}";
            var npsSent = await db.AnalyticsEvents.AnyAsync(a => a.Type == "PostSalesEmail" && a.Label == npsMarker, ct);
            if (!npsSent)
            {
                await email.SendCustomEmailAsync(
                    user.Email,
                    "Como foi sua experiencia de compra?",
                    "<p>Queremos ouvir voce. Avalie sua experiencia de 0 a 10 no painel da sua conta.</p>",
                    "Queremos ouvir voce. Avalie sua experiencia de 0 a 10 no painel da sua conta.");

                db.AnalyticsEvents.Add(new AnalyticsEvent
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Type = "PostSalesEmail",
                    Category = "NPS",
                    Action = "SendNps",
                    Label = npsMarker,
                    Value = 1,
                    Url = "/account/nps",
                    CreatedAt = now
                });
            }

            if (order.CreatedAt > now.AddDays(-30))
            {
                continue;
            }

            var repurchaseMarker = $"REPURCHASE:{order.Id}";
            var repurchaseSent = await db.AnalyticsEvents.AnyAsync(a => a.Type == "PostSalesEmail" && a.Label == repurchaseMarker, ct);
            if (repurchaseSent)
            {
                continue;
            }

            var topProductIds = order.Items
                .GroupBy(i => i.ProductId)
                .OrderByDescending(g => g.Sum(i => i.Quantity))
                .Select(g => g.Key)
                .Take(3)
                .ToList();

            var lines = new List<string>();
            foreach (var productId in topProductIds)
            {
                try
                {
                    var product = await productService.GetProductAsync(productId);
                    lines.Add($"- {product.Name} ({product.Price:C})");
                }
                catch
                {
                    // ignore deleted product
                }
            }

            if (lines.Count == 0)
            {
                continue;
            }

            var text = "Baseado na sua ultima compra, talvez voce goste de:\n" + string.Join("\n", lines);
            var html = "<p>Baseado na sua ultima compra, talvez voce goste de:</p><ul>" + string.Join(string.Empty, lines.Select(x => $"<li>{System.Net.WebUtility.HtmlEncode(x.TrimStart('-', ' '))}</li>")) + "</ul>";

            await email.SendCustomEmailAsync(user.Email, "Sugestoes para sua proxima compra", html, text);

            db.AnalyticsEvents.Add(new AnalyticsEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Type = "PostSalesEmail",
                Category = "Repurchase",
                Action = "SendSuggestion",
                Label = repurchaseMarker,
                Value = 1,
                Url = "/recommendations",
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
