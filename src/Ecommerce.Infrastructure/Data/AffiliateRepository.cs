using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class AffiliateRepository : IAffiliateRepository
{
    private readonly EcommerceDbContext _context;

    public AffiliateRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddPartnerAsync(AffiliatePartner partner)
    {
        await _context.AffiliatePartners.AddAsync(partner);
        await _context.SaveChangesAsync();
    }

    public async Task<AffiliatePartner?> GetPartnerByCodeAsync(string code)
        => await _context.AffiliatePartners.FirstOrDefaultAsync(p => p.Code == code);

    public async Task<AffiliatePartner?> GetPartnerByIdAsync(Guid id)
        => await _context.AffiliatePartners.FirstOrDefaultAsync(p => p.Id == id);

    public async Task AddConversionAsync(AffiliateConversion conversion)
    {
        await _context.AffiliateConversions.AddAsync(conversion);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<AffiliateConversion>> GetConversionsByPartnerAsync(Guid partnerId)
        => await _context.AffiliateConversions
            .Where(c => c.PartnerId == partnerId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

    public async Task<AffiliateConversion?> GetConversionByIdAsync(Guid id)
        => await _context.AffiliateConversions.FirstOrDefaultAsync(c => c.Id == id);

    public async Task UpdateConversionAsync(AffiliateConversion conversion)
    {
        _context.AffiliateConversions.Update(conversion);
        await _context.SaveChangesAsync();
    }
}
