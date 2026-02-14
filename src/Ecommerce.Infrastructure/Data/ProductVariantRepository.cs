using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ProductVariantRepository : IProductVariantRepository
{
    private readonly EcommerceDbContext _context;

    public ProductVariantRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<ProductVariant?> GetByIdAsync(Guid id)
        => await _context.ProductVariants.FirstOrDefaultAsync(v => v.Id == id);

    public async Task<ProductVariant?> GetBySkuAsync(string sku)
        => await _context.ProductVariants.FirstOrDefaultAsync(v => v.Sku == sku);

    public async Task<IEnumerable<ProductVariant>> GetByProductIdAsync(Guid productId)
        => await _context.ProductVariants.Where(v => v.ProductId == productId).ToListAsync();

    public async Task<IEnumerable<ProductVariant>> GetLowStockAsync(int threshold)
        => await _context.ProductVariants
            .Where(v => v.Stock <= threshold)
            .OrderBy(v => v.Stock)
            .ToListAsync();

    public async Task AddAsync(ProductVariant variant)
    {
        await _context.ProductVariants.AddAsync(variant);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ProductVariant variant)
    {
        _context.ProductVariants.Update(variant);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            return;
        }

        _context.ProductVariants.Remove(existing);
        await _context.SaveChangesAsync();
    }
}
