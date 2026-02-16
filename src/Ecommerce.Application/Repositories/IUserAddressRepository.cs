using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IUserAddressRepository
{
    Task AddAsync(UserAddress address);
    Task UpdateAsync(UserAddress address);
    Task DeleteAsync(Guid id);
    Task<UserAddress?> GetByIdAsync(Guid id);
    Task<IEnumerable<UserAddress>> GetByUserIdAsync(Guid userId);
    Task ClearDefaultAsync(Guid userId);
}
