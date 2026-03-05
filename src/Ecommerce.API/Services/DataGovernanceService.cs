using System.Text;
using System.Text.Json;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public class DataGovernanceService
{
    private readonly EcommerceDbContext _db;

    public DataGovernanceService(EcommerceDbContext db)
    {
        _db = db;
    }

    public async Task<string> ExportUserDataAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("User not found");
        var orders = await _db.Orders.Include(o => o.Items).Where(o => o.UserId == userId).ToListAsync(ct);
        var carts = await _db.CartItems.Where(c => c.UserId == userId).ToListAsync(ct);
        var analytics = await _db.AnalyticsEvents.Where(a => a.UserId == userId).OrderByDescending(a => a.CreatedAt).Take(500).ToListAsync(ct);

        var payload = new
        {
            exportedAt = DateTime.UtcNow,
            user,
            orders,
            cart = carts,
            analytics
        };

        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task AnonymizeUserDataAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("User not found");

        user.Email = $"anon+{user.Id:N}@redacted.local";
        user.FullName = "Anonymized User";
        user.IsAnonymized = true;
        user.MarketingEmailOptIn = false;
        user.AnalyticsConsent = false;
        user.ConsentUpdatedAt = DateTime.UtcNow;

        var addresses = await _db.UserAddresses.Where(a => a.UserId == userId).ToListAsync(ct);
        foreach (var addr in addresses)
        {
            addr.RecipientName = "Redacted";
            addr.Phone = "0000000000";
            addr.Line1 = "Redacted";
            addr.Line2 = null;
            addr.City = "Redacted";
            addr.State = "Redacted";
            addr.PostalCode = "00000";
            addr.Country = "Redacted";
        }

        var analytics = await _db.AnalyticsEvents.Where(a => a.UserId == userId).ToListAsync(ct);
        foreach (var ev in analytics)
        {
            ev.Label = null;
            ev.Url = null;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<int> PurgeOldAnalyticsAsync(int retentionDays, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
        var items = await _db.AnalyticsEvents.Where(a => a.CreatedAt < cutoff).ToListAsync(ct);
        if (items.Count == 0)
        {
            return 0;
        }

        _db.AnalyticsEvents.RemoveRange(items);
        await _db.SaveChangesAsync(ct);
        return items.Count;
    }

    public (bool healthy, string message) CheckBackupHealth()
    {
        var backupDir = Environment.GetEnvironmentVariable("BACKUP_DIR") ?? "artifacts/backups";
        if (!Directory.Exists(backupDir))
        {
            return (false, $"Backup directory not found: {backupDir}");
        }

        var latest = new DirectoryInfo(backupDir)
            .GetFiles("*", SearchOption.TopDirectoryOnly)
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .FirstOrDefault();

        if (latest == null)
        {
            return (false, "No backup files found");
        }

        var maxAgeHours = int.TryParse(Environment.GetEnvironmentVariable("BACKUP_MAX_AGE_HOURS"), out var value)
            ? value
            : 24;

        var age = DateTime.UtcNow - latest.LastWriteTimeUtc;
        if (age.TotalHours > maxAgeHours)
        {
            return (false, $"Latest backup is stale: {latest.Name}, age {age.TotalHours:F1}h");
        }

        return (true, $"Latest backup: {latest.Name}, age {age.TotalHours:F1}h");
    }
}
