using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class ReviewService
{
    private readonly IReviewRepository _reviews;
    private readonly IReviewVoteRepository _votes;

    public ReviewService(IReviewRepository reviews, IReviewVoteRepository votes)
    {
        _reviews = reviews;
        _votes = votes;
    }

    public async Task<Review> CreateAsync(Guid productId, Guid userId, int rating, string content)
    {
        var review = new Review
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            UserId = userId,
            Rating = rating,
            Content = content,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _reviews.AddAsync(review);
        return review;
    }

    public async Task<IEnumerable<Review>> GetByProductAsync(Guid productId)
        => await _reviews.GetByProductIdAsync(productId);

    public async Task<Review?> UpdateAsync(Guid id, int? rating, string? content)
    {
        var review = await _reviews.GetByIdAsync(id);
        if (review == null)
        {
            return null;
        }

        if (rating.HasValue)
        {
            review.Rating = rating.Value;
        }

        if (!string.IsNullOrWhiteSpace(content))
        {
            review.Content = content;
        }

        review.UpdatedAt = DateTime.UtcNow;
        await _reviews.UpdateAsync(review);
        return review;
    }

    public async Task DeleteAsync(Guid id)
        => await _reviews.DeleteAsync(id);

    public async Task<bool> ModerateAsync(Guid id, string status)
    {
        var review = await _reviews.GetByIdAsync(id);
        if (review == null)
        {
            return false;
        }

        review.Status = status;
        review.UpdatedAt = DateTime.UtcNow;
        await _reviews.UpdateAsync(review);
        return true;
    }

    public async Task<bool> VoteAsync(Guid reviewId, Guid userId, bool helpful)
    {
        var existing = await _votes.GetByReviewAndUserAsync(reviewId, userId);
        if (existing != null)
        {
            return false;
        }

        var review = await _reviews.GetByIdAsync(reviewId);
        if (review == null)
        {
            return false;
        }

        if (helpful)
        {
            review.HelpfulCount += 1;
        }
        else
        {
            review.NotHelpfulCount += 1;
        }

        review.UpdatedAt = DateTime.UtcNow;
        await _reviews.UpdateAsync(review);

        await _votes.AddAsync(new ReviewVote
        {
            Id = Guid.NewGuid(),
            ReviewId = reviewId,
            UserId = userId,
            Helpful = helpful,
            CreatedAt = DateTime.UtcNow
        });

        return true;
    }

    public async Task<(double average, int count)> GetStatsAsync(Guid productId)
    {
        var reviews = (await _reviews.GetByProductIdAsync(productId)).ToList();
        if (!reviews.Any())
        {
            return (0, 0);
        }

        return (reviews.Average(r => r.Rating), reviews.Count);
    }
}
