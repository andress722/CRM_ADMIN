# WISHLIST & PRODUCT REVIEWS SYSTEM - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** User wishlists, product reviews with ratings, moderation, helpful voting

---

## 1. REVIEW & WISHLIST ENTITIES

### 1.1 Domain Model

```csharp
// Domain/Entities/Reviews/ProductReview.cs
public class ProductReview
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public Guid UserId { get; set; }
  public Guid? OrderItemId { get; set; }             // Verified purchase
  
  public int Rating { get; set; }                    // 1-5 stars
  public string Title { get; set; }                  // "Great product!"
  public string Content { get; set; }                // Full review text
  
  // Moderation
  public ReviewStatus Status { get; set; }           // Pending, Approved, Rejected
  public string RejectionReason { get; set; }
  public Guid? ModeratedByUserId { get; set; }
  public DateTime? ModeratedAt { get; set; }
  
  // Engagement
  public int HelpfulCount { get; set; }
  public int UnhelpfulCount { get; set; }
  public int ReplyCount { get; set; }
  
  // Images/video
  public List<ReviewMedia> Media { get; set; }
  
  // Dates
  public DateTime CreatedAt { get; set; }
  public DateTime? UpdatedAt { get; set; }
  public bool IsEdited => UpdatedAt.HasValue && UpdatedAt > CreatedAt;
  
  // Relations
  public Product Product { get; set; }
  public User User { get; set; }
  public OrderItem OrderItem { get; set; }
  public User ModeratedBy { get; set; }
  public List<ReviewReply> Replies { get; set; }
  public List<ReviewHelpfulness> HelpfulnessVotes { get; set; }
}

public enum ReviewStatus
{
  Pending,
  Approved,
  Rejected,
  Hidden           // Approved but hidden (rule violation)
}

// Review images/videos
public class ReviewMedia
{
  public Guid Id { get; set; }
  public Guid ReviewId { get; set; }
  public string MediaUrl { get; set; }
  public string MediaType { get; set; }              // "image", "video"
  public int DisplayOrder { get; set; }
  
  public ProductReview Review { get; set; }
}

// Staff/seller replies to reviews
public class ReviewReply
{
  public Guid Id { get; set; }
  public Guid ReviewId { get; set; }
  public Guid UserId { get; set; }                   // Staff member
  public string Content { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? UpdatedAt { get; set; }
  
  public ProductReview Review { get; set; }
  public User User { get; set; }
}

// Track which users found review helpful/unhelpful
public class ReviewHelpfulness
{
  public Guid Id { get; set; }
  public Guid ReviewId { get; set; }
  public Guid UserId { get; set; }
  public ReviewHelpfulnessVote Vote { get; set; }    // Helpful, Unhelpful
  public DateTime CreatedAt { get; set; }
  
  public ProductReview Review { get; set; }
  public User User { get; set; }
}

public enum ReviewHelpfulnessVote
{
  Helpful,
  Unhelpful
}

// User wishlist
public class Wishlist
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public string Name { get; set; }                   // "Wishlist", "Birthday", etc
  public string Description { get; set; }
  public WishlistVisibility Visibility { get; set; }
  public int ItemCount => WishlistItems.Count;
  public DateTime CreatedAt { get; set; }
  
  public User User { get; set; }
  public List<WishlistItem> WishlistItems { get; set; }
}

public enum WishlistVisibility
{
  Private,
  FriendsOnly,
  Public
}

// Item in wishlist
public class WishlistItem
{
  public Guid Id { get; set; }
  public Guid WishlistId { get; set; }
  public Guid ProductId { get; set; }
  public Guid? VariantId { get; set; }               // If variant-specific
  public string Note { get; set; }                   // User's note "Size M please"
  public int Priority { get; set; }                  // 1-5, for prioritization
  public DateTime AddedAt { get; set; }
  
  public Wishlist Wishlist { get; set; }
  public Product Product { get; set; }
  public ProductVariant Variant { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Product reviews
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT NOT NULL,
  
  status VARCHAR(50) DEFAULT 'Pending',           -- Pending, Approved, Rejected, Hidden
  rejection_reason VARCHAR(500),
  moderated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP,
  
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  UNIQUE(product_id, user_id, order_item_id)      -- One review per verified purchase
);

CREATE INDEX idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_reviews_status ON product_reviews(status);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_reviews_created_at ON product_reviews(created_at DESC);

-- Review media (images/videos)
CREATE TABLE review_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  media_url VARCHAR(500) NOT NULL,
  media_type VARCHAR(50),                           -- image, video
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_media_review_id ON review_media(review_id);

-- Review replies
CREATE TABLE review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX idx_review_replies_user_id ON review_replies(user_id);

-- Helpful/unhelpful votes
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(50) NOT NULL,                        -- Helpful, Unhelpful
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(review_id, user_id)                       -- One vote per user per review
);

CREATE INDEX idx_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX idx_helpfulness_user_id ON review_helpfulness(user_id);

-- Wishlists
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  visibility VARCHAR(50) DEFAULT 'Private',        -- Private, FriendsOnly, Public
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wishlists_user_default ON wishlists(user_id) 
  WHERE name = 'Wishlist';  -- One default wishlist per user

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);

-- Wishlist items
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  note VARCHAR(500),
  priority INT DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  added_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(wishlist_id, product_id, variant_id)     -- No duplicates
);

CREATE INDEX idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);
```

---

## 2. REVIEW & WISHLIST SERVICES

```csharp
// Application/Services/ReviewService.cs
public interface IReviewService
{
  Task<ProductReviewDto> CreateReviewAsync(CreateReviewDto dto, Guid userId);
  Task<ProductReviewDto> GetByIdAsync(Guid id);
  Task<PagedResult<ProductReviewDto>> GetByProductAsync(Guid productId, int page = 1, int pageSize = 10);
  Task<PagedResult<ProductReviewDto>> GetByUserAsync(Guid userId, int page = 1, int pageSize = 10);
  Task<ProductReviewDto> UpdateReviewAsync(Guid id, UpdateReviewDto dto, Guid userId);
  Task DeleteReviewAsync(Guid id, Guid userId);
  Task<ProductReviewDto> ModerateReviewAsync(Guid id, bool approve, string rejectionReason = null);
  Task<ProductReviewDto> AddHelpfulVoteAsync(Guid reviewId, Guid userId, bool isHelpful);
  Task<ReviewReplyDto> ReplyToReviewAsync(Guid reviewId, ReviewReplyDto dto, Guid userId);
  Task<ProductReviewStatisticsDto> GetProductStatisticsAsync(Guid productId);
}

public class ReviewService : IReviewService
{
  private readonly IReviewRepository _reviewRepository;
  private readonly IProductRepository _productRepository;
  private readonly IOrderRepository _orderRepository;
  private readonly IMapper _mapper;
  private readonly ILogger<ReviewService> _logger;

  // 1. CREATE REVIEW
  public async Task<ProductReviewDto> CreateReviewAsync(CreateReviewDto dto, Guid userId)
  {
    // Validate product exists
    var product = await _productRepository.GetByIdAsync(dto.ProductId);
    if (product == null)
      throw new NotFoundException("Product not found");

    // Check if user already reviewed this product
    var existingReview = await _reviewRepository.GetByProductAndUserAsync(dto.ProductId, userId);
    if (existingReview != null)
      throw new ValidationException("You have already reviewed this product");

    // Verify purchase if order item is provided
    bool isVerifiedPurchase = false;
    if (dto.OrderItemId.HasValue)
    {
      var orderItem = await _orderRepository.GetOrderItemAsync(dto.OrderItemId.Value);
      if (orderItem?.Order?.UserId == userId && orderItem.ProductId == dto.ProductId)
        isVerifiedPurchase = true;
    }

    var review = new ProductReview
    {
      ProductId = dto.ProductId,
      UserId = userId,
      OrderItemId = isVerifiedPurchase ? dto.OrderItemId : null,
      Rating = dto.Rating,
      Title = dto.Title,
      Content = dto.Content,
      Status = ReviewStatus.Pending,  // Moderation queue
      CreatedAt = DateTime.UtcNow
    };

    await _reviewRepository.AddAsync(review);

    _logger.LogInformation("Review created: {id}, product={productId}, rating={rating}",
      review.Id, dto.ProductId, dto.Rating);

    return _mapper.Map<ProductReviewDto>(review);
  }

  // 2. MODERATE REVIEWS (Admin)
  public async Task<ProductReviewDto> ModerateReviewAsync(Guid id, bool approve, string rejectionReason = null)
  {
    var review = await _reviewRepository.GetByIdAsync(id);
    if (review == null)
      throw new NotFoundException("Review not found");

    if (approve)
    {
      review.Status = ReviewStatus.Approved;
    }
    else
    {
      review.Status = ReviewStatus.Rejected;
      review.RejectionReason = rejectionReason ?? "Does not meet guidelines";
    }

    review.ModeratedAt = DateTime.UtcNow;

    await _reviewRepository.UpdateAsync(review);

    // Update product rating cache
    await UpdateProductRatingAsync(review.ProductId);

    _logger.LogInformation("Review moderated: {id}, approved={approved}", id, approve);

    return _mapper.Map<ProductReviewDto>(review);
  }

  // 3. HELPFUL VOTING
  public async Task<ProductReviewDto> AddHelpfulVoteAsync(Guid reviewId, Guid userId, bool isHelpful)
  {
    var review = await _reviewRepository.GetByIdAsync(reviewId);
    if (review == null)
      throw new NotFoundException("Review not found");

    // Check if user already voted
    var existingVote = await _reviewRepository.GetHelpfulnessVoteAsync(reviewId, userId);
    if (existingVote != null)
    {
      // Update existing vote
      existingVote.Vote = isHelpful ? ReviewHelpfulnessVote.Helpful : ReviewHelpfulnessVote.Unhelpful;
      await _reviewRepository.UpdateHelpfulnessAsync(existingVote);
    }
    else
    {
      // Add new vote
      var vote = new ReviewHelpfulness
      {
        ReviewId = reviewId,
        UserId = userId,
        Vote = isHelpful ? ReviewHelpfulnessVote.Helpful : ReviewHelpfulnessVote.Unhelpful,
        CreatedAt = DateTime.UtcNow
      };
      await _reviewRepository.AddHelpfulnessAsync(vote);
    }

    // Recalculate counts
    var helpfulCount = await _reviewRepository.GetHelpfulVoteCountAsync(reviewId, true);
    var unhelpfulCount = await _reviewRepository.GetHelpfulVoteCountAsync(reviewId, false);

    review.HelpfulCount = helpfulCount;
    review.UnhelpfulCount = unhelpfulCount;

    await _reviewRepository.UpdateAsync(review);

    return _mapper.Map<ProductReviewDto>(review);
  }

  // 4. GET PRODUCT STATISTICS
  public async Task<ProductReviewStatisticsDto> GetProductStatisticsAsync(Guid productId)
  {
    var reviews = await _reviewRepository.GetByProductAsync(productId);

    var approvedReviews = reviews.Where(x => x.Status == ReviewStatus.Approved).ToList();

    return new ProductReviewStatisticsDto
    {
      ProductId = productId,
      TotalReviews = approvedReviews.Count,
      AverageRating = approvedReviews.Any() ? approvedReviews.Average(x => x.Rating) : 0,
      RatingDistribution = new Dictionary<int, int>
      {
        { 5, approvedReviews.Count(x => x.Rating == 5) },
        { 4, approvedReviews.Count(x => x.Rating == 4) },
        { 3, approvedReviews.Count(x => x.Rating == 3) },
        { 2, approvedReviews.Count(x => x.Rating == 2) },
        { 1, approvedReviews.Count(x => x.Rating == 1) }
      },
      VerifiedPurchaseCount = approvedReviews.Count(x => x.OrderItemId.HasValue),
      RecentReviews = approvedReviews
        .OrderByDescending(x => x.CreatedAt)
        .Take(5)
        .Select(x => _mapper.Map<ProductReviewDto>(x))
    };
  }

  private async Task UpdateProductRatingAsync(Guid productId)
  {
    var product = await _productRepository.GetByIdAsync(productId);
    if (product != null)
    {
      var reviews = await _reviewRepository.GetByProductAsync(productId);
      var approvedReviews = reviews.Where(x => x.Status == ReviewStatus.Approved).ToList();
      
      product.AverageRating = approvedReviews.Any() ? approvedReviews.Average(x => x.Rating) : 0;
      product.ReviewCount = approvedReviews.Count;

      await _productRepository.UpdateAsync(product);
    }
  }
}

// Wishlist Service
public interface IWishlistService
{
  Task<WishlistDto> GetUserDefaultWishlistAsync(Guid userId);
  Task<WishlistDto> CreateWishlistAsync(CreateWishlistDto dto, Guid userId);
  Task AddItemAsync(Guid wishlistId, Guid productId, Guid? variantId = null);
  Task RemoveItemAsync(Guid wishlistId, Guid itemId);
  Task<WishlistDto> GetWishlistAsync(Guid wishlistId, Guid userId);
  Task<bool> IsProductInWishlistAsync(Guid userId, Guid productId);
  Task<IEnumerable<WishlistDto>> GetUserWishlistsAsync(Guid userId);
}

public class WishlistService : IWishlistService
{
  private readonly IWishlistRepository _wishlistRepository;
  private readonly IProductRepository _productRepository;
  private readonly IMapper _mapper;
  private readonly ILogger<WishlistService> _logger;

  // Get or create default wishlist
  public async Task<WishlistDto> GetUserDefaultWishlistAsync(Guid userId)
  {
    var wishlist = await _wishlistRepository.GetDefaultAsync(userId);

    if (wishlist == null)
    {
      wishlist = new Wishlist
      {
        UserId = userId,
        Name = "Wishlist",
        Visibility = WishlistVisibility.Private,
        CreatedAt = DateTime.UtcNow
      };

      await _wishlistRepository.AddAsync(wishlist);
      _logger.LogInformation("Default wishlist created for user {userId}", userId);
    }

    return _mapper.Map<WishlistDto>(wishlist);
  }

  public async Task AddItemAsync(Guid wishlistId, Guid productId, Guid? variantId = null)
  {
    var wishlist = await _wishlistRepository.GetByIdAsync(wishlistId);
    if (wishlist == null)
      throw new NotFoundException("Wishlist not found");

    // Check if already in wishlist
    var existingItem = await _wishlistRepository.GetItemAsync(wishlistId, productId, variantId);
    if (existingItem != null)
      throw new ValidationException("Product already in wishlist");

    var item = new WishlistItem
    {
      WishlistId = wishlistId,
      ProductId = productId,
      VariantId = variantId,
      AddedAt = DateTime.UtcNow
    };

    await _wishlistRepository.AddItemAsync(item);

    _logger.LogInformation("Item added to wishlist: {wishlistId}, product={productId}",
      wishlistId, productId);
  }

  public async Task<bool> IsProductInWishlistAsync(Guid userId, Guid productId)
  {
    var wishlist = await _wishlistRepository.GetDefaultAsync(userId);
    if (wishlist == null)
      return false;

    var item = await _wishlistRepository.GetItemAsync(wishlist.Id, productId, null);
    return item != null;
  }
}
```

---

## 3. REVIEW & WISHLIST FRONTEND

```typescript
// src/components/ProductReviews.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  createdAt: string;
  media: any[];
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    const [reviewsRes, statsRes] = await Promise.all([
      api.get(`/products/${productId}/reviews`),
      api.get(`/products/${productId}/review-stats`)
    ]);

    setReviews(reviewsRes.data.items);
    setStats(statsRes.data);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      alert('Please login to review');
      return;
    }

    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        title,
        content
      });

      setShowForm(false);
      setTitle('');
      setContent('');
      setRating(5);
      loadReviews();
    } catch (err) {
      console.error('Failed to submit review', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-3xl font-bold">{stats?.averageRating.toFixed(1)}</div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.round(stats?.averageRating) ? '⭐' : '☆'} />
            ))}
          </div>
          <div className="text-sm text-gray-600">{stats?.totalReviews} reviews</div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm">{rating}★</span>
              <div className="flex-1 bg-gray-200 rounded h-2">
                <div
                  className="bg-yellow-400 h-2 rounded"
                  style={{
                    width: `${(stats?.ratingDistribution[rating] / stats?.totalReviews) * 100}%`
                  }}
                />
              </div>
              <span className="text-xs text-gray-600">{stats?.ratingDistribution[rating]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review Button */}
      {user && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="border rounded p-4 space-y-4">
          <div>
            <label className="block font-semibold mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`text-2xl ${r <= rating ? '⭐' : '☆'}`}
                />
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Review title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <textarea
            placeholder="Write your review..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmitReview}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Submit Review
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="border rounded p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">{review.title}</div>
                <div className="flex gap-2 text-sm text-gray-600">
                  <span>{review.author}</span>
                  {review.isVerifiedPurchase && <span className="text-green-600">✓ Verified Purchase</span>}
                </div>
              </div>
              <div className="text-yellow-400">{'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
            </div>

            <p className="mb-3">{review.content}</p>

            <div className="flex gap-4 text-sm">
              <button className="text-gray-600 hover:text-blue-600">
                👍 Helpful ({review.helpfulCount})
              </button>
              <button className="text-gray-600 hover:text-blue-600">
                👎 Not helpful ({review.unhelpfulCount})
              </button>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              {new Date(review.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Wishlist Component
export function WishlistButton({ productId, userId }: { productId: string; userId: string }) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWishlist();
  }, [productId]);

  const checkWishlist = async () => {
    const res = await api.get(`/wishlists/contains/${productId}`);
    setIsInWishlist(res.data.isInWishlist);
  };

  const toggleWishlist = async () => {
    setLoading(true);
    try {
      if (isInWishlist) {
        await api.post(`/wishlists/remove`, { productId });
      } else {
        await api.post(`/wishlists/add`, { productId });
      }
      setIsInWishlist(!isInWishlist);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`px-4 py-2 rounded ${
        isInWishlist
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {isInWishlist ? '❤️ Remove from Wishlist' : '🤍 Add to Wishlist'}
    </button>
  );
}
```

---

## 4. REVIEWS & WISHLIST CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: product_reviews table
- [ ] Migration: review_media table
- [ ] Migration: review_replies table
- [ ] Migration: review_helpfulness table
- [ ] Migration: wishlists table
- [ ] Migration: wishlist_items table

### Backend - Reviews
- [ ] ProductReview entity
- [ ] ReviewMedia, ReviewReply, ReviewHelpfulness entities
- [ ] IReviewService interface
- [ ] ReviewService implementation
- [ ] Review moderation queue logic
- [ ] Review statistics calculation
- [ ] Helpful voting system

### Backend - Wishlist
- [ ] Wishlist entity
- [ ] WishlistItem entity
- [ ] IWishlistService interface
- [ ] WishlistService implementation
- [ ] Default wishlist auto-creation

### API Endpoints - Reviews
- [ ] POST /products/{id}/reviews (create)
- [ ] GET /products/{id}/reviews (list)
- [ ] PUT /reviews/{id} (update own)
- [ ] DELETE /reviews/{id} (delete own)
- [ ] POST /reviews/{id}/moderate (admin)
- [ ] POST /reviews/{id}/helpful (vote)
- [ ] GET /products/{id}/review-stats

### API Endpoints - Wishlist
- [ ] GET /wishlists/default (get or create)
- [ ] POST /wishlists (create custom)
- [ ] GET /wishlists/{id} (get specific)
- [ ] POST /wishlists/{id}/items (add item)
- [ ] DELETE /wishlists/{id}/items/{itemId} (remove)
- [ ] GET /wishlists/contains/{productId} (check)

### Frontend
- [ ] Product review list with ratings
- [ ] Review form with rating selector
- [ ] Helpful/unhelpful voting
- [ ] Verified purchase badge
- [ ] Review statistics display
- [ ] Wishlist button on product page
- [ ] Wishlist management page
- [ ] Share wishlist feature

### Features
- [ ] Review moderation queue (admin approval)
- [ ] One review per user per product
- [ ] Verified purchase indicator
- [ ] Helpful voting tracking
- [ ] Staff replies to reviews
- [ ] Review media (images)
- [ ] Multiple wishlists per user
- [ ] Wishlist visibility settings (private/public)

### Testing
- [ ] Unit: Review creation validation
- [ ] Unit: Rating calculation
- [ ] Integration: Review CRUD
- [ ] Integration: Wishlist management
- [ ] E2E: Review submission flow
- [ ] E2E: Wishlist add/remove
```

---

**Wishlist & Product Reviews System Completo ✅**
