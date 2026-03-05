using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1")]
public class ReviewsController : ControllerBase
{
    private readonly ReviewService _reviews;
    private readonly WishlistService _wishlists;
    private readonly AnalyticsService _analyticsService;

    public ReviewsController(ReviewService reviews, WishlistService wishlists, AnalyticsService analyticsService)
    {
        _reviews = reviews;
        _wishlists = wishlists;
        _analyticsService = analyticsService;
    }

    [HttpPost("products/{id:guid}/reviews")]
    public async Task<IActionResult> CreateReview(Guid id, [FromBody] ReviewCreateRequest request)
    {
        var review = await _reviews.CreateAsync(id, request.UserId, request.Rating, request.Content);
        return Ok(review);
    }

    [HttpGet("products/{id:guid}/reviews")]
    public async Task<IActionResult> ListReviews(Guid id)
    {
        return Ok(await _reviews.GetByProductAsync(id));
    }

    [HttpPut("reviews/{id:guid}")]
    [Authorize(Policy = "OwnerOrAdmin")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] ReviewUpdateRequest request)
    {
        var review = await _reviews.UpdateAsync(id, request.Rating, request.Content);
        return review == null ? NotFound() : Ok(review);
    }

    [HttpDelete("reviews/{id:guid}")]
    [Authorize(Policy = "OwnerOrAdmin")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        await _reviews.DeleteAsync(id);
        return Ok(new { message = "Review deleted" });
    }

    [HttpPost("reviews/{id:guid}/moderate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Moderate(Guid id, [FromBody] ModerateRequest request)
    {
        var ok = await _reviews.ModerateAsync(id, request.Status);
        return ok ? Ok(new { message = "Review moderated" }) : NotFound();
    }

    [HttpPost("reviews/{id:guid}/helpful")]
    public async Task<IActionResult> Helpful(Guid id, [FromBody] HelpfulRequest request)
    {
        var role = User.FindFirstValue(System.Security.Claims.ClaimTypes.Role) ?? string.Empty;
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (currentUserId == Guid.Empty && !role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (!role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && request.UserId != currentUserId)
        {
            return Forbid();
        }

        var ok = await _reviews.VoteAsync(id, request.UserId, request.Helpful);
        return ok ? Ok(new { message = "Vote recorded" }) : BadRequest(new { message = "Vote rejected" });
    }

    [HttpGet("products/{id:guid}/review-stats")]
    public async Task<IActionResult> Stats(Guid id)
    {
        var stats = await _reviews.GetStatsAsync(id);
        return Ok(new { average = stats.average, count = stats.count });
    }

    [HttpGet("wishlists/default")]
    public async Task<IActionResult> GetDefault([FromQuery] Guid userId)
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != userId)
        {
            return Forbid();
        }
        var wishlist = await _wishlists.GetOrCreateDefaultAsync(userId);
        var items = await _wishlists.GetItemsAsync(wishlist.Id);
        return Ok(new { wishlist.Id, wishlist.UserId, wishlist.Name, items });
    }

    [HttpPost("wishlists")]
    public async Task<IActionResult> CreateWishlist([FromBody] WishlistCreateRequest request)
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != request.UserId)
        {
            return Forbid();
        }
        var wishlist = await _wishlists.CreateAsync(request.UserId, request.Name);
        return Ok(new { wishlist.Id, wishlist.UserId, wishlist.Name, items = Array.Empty<object>() });
    }

    [HttpGet("wishlists/{id:guid}")]
    public async Task<IActionResult> GetWishlist(Guid id)
    {
        var wishlist = await _wishlists.GetAsync(id);
        if (wishlist == null)
        {
            return NotFound();
        }
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != wishlist.UserId)
        {
            return Forbid();
        }

        var items = await _wishlists.GetItemsAsync(wishlist.Id);
        return Ok(new { wishlist.Id, wishlist.UserId, wishlist.Name, items });
    }

    [HttpPost("wishlists/{id:guid}/items")]
    public async Task<IActionResult> AddItem(Guid id, [FromBody] WishlistItemRequest request)
    {
        var wishlist = await _wishlists.GetAsync(id);
        if (wishlist == null)
        {
            return NotFound();
        }
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != wishlist.UserId)
        {
            return Forbid();
        }

        var item = await _wishlists.AddItemAsync(id, request.ProductId);

        await _analyticsService.TrackAsync(new AnalyticsEvent
        {
            Id = Guid.NewGuid(),
            UserId = wishlist.UserId,
            Type = "WishlistAdd",
            Category = "Wishlist",
            Action = "AddItem",
            Label = request.ProductId.ToString(),
            Value = 1,
            Url = "/wishlist",
            CreatedAt = DateTime.UtcNow
        });

        var items = await _wishlists.GetItemsAsync(wishlist.Id);
        return Ok(new { wishlist.Id, wishlist.UserId, wishlist.Name, items, addedItem = item });
    }

    [HttpDelete("wishlists/{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid id, Guid itemId)
    {
        var wishlist = await _wishlists.GetAsync(id);
        if (wishlist == null)
        {
            return NotFound();
        }
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != wishlist.UserId)
        {
            return Forbid();
        }

        await _wishlists.RemoveItemAsync(itemId);
        var items = await _wishlists.GetItemsAsync(wishlist.Id);
        return Ok(new { wishlist.Id, wishlist.UserId, wishlist.Name, items });
    }

    [HttpGet("wishlists/contains/{productId:guid}")]
    public async Task<IActionResult> Contains(Guid productId, [FromQuery] Guid userId)
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var currentUserId = Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
        if (!User.IsInRole("Admin") && currentUserId != userId)
        {
            return Forbid();
        }

        var contains = await _wishlists.ContainsAsync(userId, productId);
        return Ok(new { contains });
    }

    public record ReviewCreateRequest(Guid UserId, int Rating, string Content);
    public record ReviewUpdateRequest(int? Rating, string? Content);
    public record ModerateRequest(string Status, string? Note);
    public record HelpfulRequest(Guid UserId, bool Helpful);
    public record WishlistCreateRequest(Guid UserId, string Name);
    public record WishlistItemRequest(Guid ProductId);
}
