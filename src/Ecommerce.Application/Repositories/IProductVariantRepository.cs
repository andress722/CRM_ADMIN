using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IProductVariantRepository
{
    Task<ProductVariant?> GetByIdAsync(Guid id);
    Task<ProductVariant?> GetBySkuAsync(string sku);
    Task<IEnumerable<ProductVariant>> GetByProductIdAsync(Guid productId);
    Task<IEnumerable<ProductVariant>> GetLowStockAsync(int threshold);
    Task AddAsync(ProductVariant variant);
    Task UpdateAsync(ProductVariant variant);
    Task DeleteAsync(Guid id);
}
