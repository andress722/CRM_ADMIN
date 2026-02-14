using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<IEnumerable<Product>> GetAllAsync();
    Task<IEnumerable<Product>> GetByCategoryAsync(string category);
    Task<Product?> GetBySkuAsync(string sku);
    Task<(IEnumerable<Product> Items, int Total)> SearchAsync(string? query, string? category, decimal? minPrice, decimal? maxPrice, int page, int pageSize);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task DeleteAsync(Guid id);
}
