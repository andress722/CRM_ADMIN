using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IAffiliateRepository
{
    Task AddPartnerAsync(AffiliatePartner partner);
    Task<AffiliatePartner?> GetPartnerByCodeAsync(string code);
    Task<AffiliatePartner?> GetPartnerByIdAsync(Guid id);
    Task AddConversionAsync(AffiliateConversion conversion);
    Task<IEnumerable<AffiliateConversion>> GetConversionsByPartnerAsync(Guid partnerId);
    Task<AffiliateConversion?> GetConversionByIdAsync(Guid id);
    Task UpdateConversionAsync(AffiliateConversion conversion);
}
