using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IReviewRepository
{
    Task AddAsync(Review review);
    Task UpdateAsync(Review review);
    Task DeleteAsync(Guid id);
    Task<Review?> GetByIdAsync(Guid id);
    Task<IEnumerable<Review>> GetByProductIdAsync(Guid productId);
}
