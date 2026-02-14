using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IDailyKpiRepository
{
    Task<DailyKpi?> GetByDateAsync(DateOnly date);
    Task UpsertAsync(DailyKpi kpi);
}
