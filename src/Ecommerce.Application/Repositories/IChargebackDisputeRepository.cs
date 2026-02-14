using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IChargebackDisputeRepository
{
    Task AddAsync(ChargebackDispute dispute);
}
