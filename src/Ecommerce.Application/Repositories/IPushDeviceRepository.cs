using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IPushDeviceRepository
{
    Task<PushDevice?> GetByUserAndTokenAsync(Guid userId, string token);
    Task<IEnumerable<PushDevice>> GetByUserAsync(Guid userId);
    Task AddAsync(PushDevice device);
    Task UpdateAsync(PushDevice device);
    Task RemoveAsync(PushDevice device);
}
