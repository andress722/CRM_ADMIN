using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IReviewVoteRepository
{
    Task AddAsync(ReviewVote vote);
    Task<ReviewVote?> GetByReviewAndUserAsync(Guid reviewId, Guid userId);
}
