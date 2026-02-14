using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class ProductVariantService
{
    private readonly IProductVariantRepository _variants;

    public ProductVariantService(IProductVariantRepository variants)
        => _variants = variants;

    public async Task<ProductVariant?> GetBySkuAsync(string sku)
        => await _variants.GetBySkuAsync(sku);

    public async Task<IEnumerable<ProductVariant>> GetByProductAsync(Guid productId)
        => await _variants.GetByProductIdAsync(productId);

    public async Task<ProductVariant> CreateAsync(Guid productId, string sku, string name, decimal price, int stock)
    {
        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Sku = sku,
            Name = name,
            Price = price,
            Stock = stock,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _variants.AddAsync(variant);
        return variant;
    }

    public async Task<ProductVariant?> UpdateAsync(Guid id, string? name, decimal? price, int? stock)
    {
        var variant = await _variants.GetByIdAsync(id);
        if (variant == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            variant.Name = name;
        }

        if (price.HasValue)
        {
            variant.Price = price.Value;
        }

        if (stock.HasValue)
        {
            variant.Stock = stock.Value;
        }

        variant.UpdatedAt = DateTime.UtcNow;
        await _variants.UpdateAsync(variant);
        return variant;
    }

    public async Task<ProductVariant?> UpdateStockAsync(Guid id, int stock)
    {
        var variant = await _variants.GetByIdAsync(id);
        if (variant == null)
        {
            return null;
        }

        variant.Stock = stock;
        variant.UpdatedAt = DateTime.UtcNow;
        await _variants.UpdateAsync(variant);
        return variant;
    }

    public async Task DeleteAsync(Guid id)
        => await _variants.DeleteAsync(id);

    public async Task<IEnumerable<ProductVariant>> LowStockAsync(int threshold)
        => await _variants.GetLowStockAsync(threshold);
}
