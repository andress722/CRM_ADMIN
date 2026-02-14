using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class AffiliateService
{
    private readonly IAffiliateRepository _repository;

    public AffiliateService(IAffiliateRepository repository)
        => _repository = repository;

    public async Task<AffiliatePartner> RegisterPartnerAsync(string email, decimal commissionRate)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required");

        if (commissionRate <= 0 || commissionRate > 1)
            throw new ArgumentException("Commission rate must be between 0 and 1");

        var partner = new AffiliatePartner
        {
            Id = Guid.NewGuid(),
            Email = email.Trim(),
            CommissionRate = commissionRate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Code = await GenerateUniqueCodeAsync()
        };

        await _repository.AddPartnerAsync(partner);
        return partner;
    }

    public async Task<AffiliatePartner> GetPartnerByCodeAsync(string code)
    {
        var partner = await _repository.GetPartnerByCodeAsync(code);
        if (partner == null)
            throw new KeyNotFoundException("Affiliate not found");
        return partner;
    }

    public async Task<IEnumerable<AffiliateConversion>> GetConversionsAsync(string code)
    {
        var partner = await GetPartnerByCodeAsync(code);
        return await _repository.GetConversionsByPartnerAsync(partner.Id);
    }

    public async Task<AffiliateConversion> CreateConversionAsync(string code, Guid orderId, decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Amount must be greater than zero");

        var partner = await GetPartnerByCodeAsync(code);
        if (!partner.IsActive)
            throw new InvalidOperationException("Affiliate is inactive");

        var conversion = new AffiliateConversion
        {
            Id = Guid.NewGuid(),
            PartnerId = partner.Id,
            OrderId = orderId,
            Amount = amount,
            CommissionAmount = Math.Round(amount * partner.CommissionRate, 2),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddConversionAsync(conversion);
        return conversion;
    }

    public async Task<AffiliateConversion> MarkConversionPaidAsync(Guid conversionId)
    {
        var conversion = await _repository.GetConversionByIdAsync(conversionId);
        if (conversion == null)
            throw new KeyNotFoundException("Conversion not found");

        conversion.Status = "Paid";
        conversion.PaidAt = DateTime.UtcNow;
        await _repository.UpdateConversionAsync(conversion);
        return conversion;
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        for (var i = 0; i < 5; i++)
        {
            var code = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            var existing = await _repository.GetPartnerByCodeAsync(code);
            if (existing == null)
                return code;
        }

        return Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
    }
}
