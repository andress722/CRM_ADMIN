using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IAnalyticsEventRepository
{
    Task AddAsync(AnalyticsEvent @event);
    Task<IEnumerable<AnalyticsEvent>> GetSinceAsync(DateTime since);
    Task<int> CountSinceAsync(DateTime since);
}
