using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class LoyaltyService
{
    private readonly EcommerceDbContext _db;

    public LoyaltyService(EcommerceDbContext db)
    {
        _db = db;
    }

    public async Task<(decimal balance, decimal earned, decimal redeemed)> GetBalanceAsync(Guid userId)
    {
        var account = await EnsureAccountAsync(userId);
        return (account.PointsBalance, account.LifetimeEarned, account.LifetimeRedeemed);
    }

    public async Task CreditForOrderAsync(Guid userId, Guid orderId, decimal orderTotal, decimal cashbackRate)
    {
        var marker = await _db.AnalyticsEvents
            .AnyAsync(x => x.Type == "LoyaltyCredit" && x.Label == orderId.ToString());

        if (marker)
        {
            return;
        }

        var credit = Math.Round(orderTotal * cashbackRate, 2, MidpointRounding.AwayFromZero);
        if (credit <= 0)
        {
            return;
        }

        var account = await EnsureAccountAsync(userId);
        account.PointsBalance += credit;
        account.LifetimeEarned += credit;
        account.UpdatedAt = DateTime.UtcNow;

        _db.AnalyticsEvents.Add(new Ecommerce.Domain.Entities.AnalyticsEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = "LoyaltyCredit",
            Category = "Loyalty",
            Action = "Credit",
            Label = orderId.ToString(),
            Value = credit,
            Url = "/loyalty",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
    }

    private async Task<Ecommerce.Domain.Entities.LoyaltyAccount> EnsureAccountAsync(Guid userId)
    {
        var account = await _db.LoyaltyAccounts.FirstOrDefaultAsync(x => x.UserId == userId);
        if (account != null)
        {
            return account;
        }

        account = new Ecommerce.Domain.Entities.LoyaltyAccount
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PointsBalance = 0,
            LifetimeEarned = 0,
            LifetimeRedeemed = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.LoyaltyAccounts.Add(account);
        await _db.SaveChangesAsync();
        return account;
    }
}
