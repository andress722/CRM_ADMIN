using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class ProductService
{
    private readonly IProductRepository _repository;

    public ProductService(IProductRepository repository)
        => _repository = repository;

    public async Task<Product> GetProductAsync(Guid id)
    {
        var product = await _repository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found");
        return product;
    }

    public async Task<IEnumerable<Product>> GetAllProductsAsync()
        => await _repository.GetAllAsync();

    public async Task<IEnumerable<Product>> GetProductsByCategoryAsync(string category)
        => await _repository.GetByCategoryAsync(category);

    public async Task<(IEnumerable<Product> Items, int Total)> SearchProductsAsync(string? query, string? category, decimal? minPrice, decimal? maxPrice, int page, int pageSize)
        => await _repository.SearchAsync(query, category, minPrice, maxPrice, page, pageSize);

    public async Task<Product> CreateProductAsync(string name, string description, decimal price, int stock, string category, string sku)
    {
        var existingProduct = await _repository.GetBySkuAsync(sku);
        if (existingProduct != null)
            throw new InvalidOperationException($"Product with SKU {sku} already exists");

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            Price = price,
            Stock = stock,
            Category = category,
            Sku = sku,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(product);
        return product;
    }

    public async Task<Product> UpdateProductAsync(Guid id, string name, string description, decimal price, int stock, string category)
    {
        var product = await GetProductAsync(id);
        product.Name = name;
        product.Description = description;
        product.Price = price;
        product.Stock = stock;
        product.Category = category;
        product.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(product);
        return product;
    }

    public async Task<Product> UpdateProductStockAsync(Guid id, int newStock)
    {
        var product = await GetProductAsync(id);
        product.Stock = newStock;
        product.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(product);
        return product;
    }

    public async Task DeleteProductAsync(Guid id)
    {
        await _repository.DeleteAsync(id);
    }
}
