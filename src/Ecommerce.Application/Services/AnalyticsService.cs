using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class AnalyticsService
{
    private readonly IAnalyticsEventRepository _events;
    private readonly IDailyKpiRepository _kpis;

    public AnalyticsService(IAnalyticsEventRepository events, IDailyKpiRepository kpis)
    {
        _events = events;
        _kpis = kpis;
    }

    public async Task TrackAsync(AnalyticsEvent @event)
    {
        await _events.AddAsync(@event);
    }

    public async Task<DailyKpi> AggregateAsync(DateOnly date)
    {
        var since = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var until = date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var events = await _events.GetSinceAsync(since);
        var dayEvents = events.Where(e => e.CreatedAt >= since && e.CreatedAt < until).ToList();

        var kpi = new DailyKpi
        {
            Id = Guid.NewGuid(),
            Date = date,
            TotalEvents = dayEvents.Count,
            Signups = dayEvents.Count(e => e.Type.Equals("Signup", StringComparison.OrdinalIgnoreCase)),
            Logins = dayEvents.Count(e => e.Type.Equals("Login", StringComparison.OrdinalIgnoreCase)),
            Purchases = dayEvents.Count(e => e.Type.Equals("Purchase", StringComparison.OrdinalIgnoreCase)),
            CreatedAt = DateTime.UtcNow
        };

        await _kpis.UpsertAsync(kpi);
        return kpi;
    }
}
