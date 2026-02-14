using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ReviewVoteRepository : IReviewVoteRepository
{
    private readonly EcommerceDbContext _context;

    public ReviewVoteRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(ReviewVote vote)
    {
        await _context.ReviewVotes.AddAsync(vote);
        await _context.SaveChangesAsync();
    }

    public async Task<ReviewVote?> GetByReviewAndUserAsync(Guid reviewId, Guid userId)
        => await _context.ReviewVotes.FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);
}
