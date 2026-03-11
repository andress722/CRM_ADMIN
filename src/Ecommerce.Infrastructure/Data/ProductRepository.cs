using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ProductRepository : IProductRepository
{
    private readonly EcommerceDbContext _context;

    public ProductRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<Product?> GetByIdAsync(Guid id)
        => await _context.Products.FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IEnumerable<Product>> GetAllAsync()
        => await _context.Products.Where(p => p.IsActive).OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Name).ToListAsync();

    public async Task<IEnumerable<Product>> GetByCategoryAsync(string category)
        => await _context.Products.Where(p => p.Category == category && p.IsActive).OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Name).ToListAsync();

    public async Task<Product?> GetBySkuAsync(string sku)
        => await _context.Products.FirstOrDefaultAsync(p => p.Sku == sku);

    public async Task<(IEnumerable<Product> Items, int Total)> SearchAsync(string? query, string? category, decimal? minPrice, decimal? maxPrice, int page, int pageSize)
    {
        var searchQuery = _context.Products.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim().ToLower();
            searchQuery = searchQuery.Where(p =>
                p.Name.ToLower().Contains(term) ||
                p.Description.ToLower().Contains(term) ||
                p.Category.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            searchQuery = searchQuery.Where(p => p.Category == cat);
        }

        if (minPrice.HasValue)
        {
            searchQuery = searchQuery.Where(p => p.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            searchQuery = searchQuery.Where(p => p.Price <= maxPrice.Value);
        }

        var total = await searchQuery.CountAsync();
        var items = await searchQuery
                        .OrderByDescending(p => p.CreatedAt)
            .ThenBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task AddAsync(Product product)
    {
        await _context.Products.AddAsync(product);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Product product)
    {
        _context.Products.Update(product);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await GetByIdAsync(id);
        if (product != null)
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
        }
    }
}

