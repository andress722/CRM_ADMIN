using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class CartService
{
    private readonly ICartRepository _cartRepository;
    private readonly IProductRepository _productRepository;

    public CartService(ICartRepository cartRepository, IProductRepository productRepository)
    {
        _cartRepository = cartRepository;
        _productRepository = productRepository;
    }

    public async Task<IEnumerable<CartItem>> GetUserCartAsync(Guid userId)
        => await _cartRepository.GetByUserIdAsync(userId);

    public async Task<CartItem> AddToCartAsync(Guid userId, Guid productId, int quantity)
    {
        if (quantity <= 0)
            throw new InvalidOperationException("Quantity must be greater than 0");

        var product = await _productRepository.GetByIdAsync(productId);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {productId} not found");

        if (product.Stock < quantity)
            throw new InvalidOperationException($"Insufficient stock for product {product.Name}");

        var existing = await _cartRepository.GetByUserAndProductAsync(userId, productId);
        if (existing != null)
        {
            existing.Quantity += quantity;
            await _cartRepository.UpdateAsync(existing);
            return existing;
        }

        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProductId = productId,
            Quantity = quantity,
            AddedAt = DateTime.UtcNow
        };

        await _cartRepository.AddAsync(cartItem);
        return cartItem;
    }

    public async Task<CartItem> UpdateCartItemAsync(Guid id, int quantity)
    {
        if (quantity <= 0)
            throw new InvalidOperationException("Quantity must be greater than 0");

        var cartItem = await _cartRepository.GetByIdAsync(id);
        if (cartItem == null)
            throw new KeyNotFoundException($"Cart item with ID {id} not found");

        cartItem.Quantity = quantity;
        await _cartRepository.UpdateAsync(cartItem);
        return cartItem;
    }

    public async Task RemoveFromCartAsync(Guid id)
        => await _cartRepository.DeleteAsync(id);

    public async Task ClearCartAsync(Guid userId)
        => await _cartRepository.ClearUserCartAsync(userId);
}
