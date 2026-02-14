using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class ChargebackDisputeRepository : IChargebackDisputeRepository
{
    private readonly EcommerceDbContext _context;

    public ChargebackDisputeRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(ChargebackDispute dispute)
    {
        await _context.ChargebackDisputes.AddAsync(dispute);
        await _context.SaveChangesAsync();
    }
}
