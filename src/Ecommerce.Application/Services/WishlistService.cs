using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class WishlistService
{
    private readonly IWishlistRepository _wishlists;
    private readonly IWishlistItemRepository _items;

    public WishlistService(IWishlistRepository wishlists, IWishlistItemRepository items)
    {
        _wishlists = wishlists;
        _items = items;
    }

    public async Task<Wishlist> GetOrCreateDefaultAsync(Guid userId)
    {
        var existing = await _wishlists.GetDefaultAsync(userId);
        if (existing != null)
        {
            return existing;
        }

        var wishlist = new Wishlist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Wishlist",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _wishlists.AddAsync(wishlist);
        return wishlist;
    }

    public async Task<Wishlist> CreateAsync(Guid userId, string name)
    {
        var wishlist = new Wishlist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _wishlists.AddAsync(wishlist);
        return wishlist;
    }

    public async Task<Wishlist?> GetAsync(Guid id)
        => await _wishlists.GetByIdAsync(id);

    public async Task<IEnumerable<WishlistItem>> GetItemsAsync(Guid wishlistId)
        => await _items.GetByWishlistIdAsync(wishlistId);

    public async Task<WishlistItem> AddItemAsync(Guid wishlistId, Guid productId)
    {
        var item = new WishlistItem
        {
            Id = Guid.NewGuid(),
            WishlistId = wishlistId,
            ProductId = productId,
            CreatedAt = DateTime.UtcNow
        };

        await _items.AddAsync(item);
        return item;
    }

    public async Task RemoveItemAsync(Guid itemId)
        => await _items.RemoveAsync(itemId);

    public async Task<bool> ContainsAsync(Guid userId, Guid productId)
    {
        var wishlist = await GetOrCreateDefaultAsync(userId);
        return await _items.ExistsAsync(wishlist.Id, productId);
    }
}
