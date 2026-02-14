using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IInventoryTransferRepository
{
    Task AddAsync(InventoryTransfer transfer);
}
