using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IBannerRepository
{
    Task<IEnumerable<Banner>> GetAllAsync();
    Task<Banner?> GetByIdAsync(Guid id);
    Task AddAsync(Banner banner);
    Task UpdateAsync(Banner banner);
    Task DeleteAsync(Guid id);
}
