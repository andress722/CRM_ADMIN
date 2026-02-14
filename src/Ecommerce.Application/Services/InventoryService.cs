using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class InventoryService
{
    private readonly IInventoryItemRepository _items;
    private readonly IInventoryMovementRepository _movements;
    private readonly IInventoryTransferRepository _transfers;

    public InventoryService(
        IInventoryItemRepository items,
        IInventoryMovementRepository movements,
        IInventoryTransferRepository transfers)
    {
        _items = items;
        _movements = movements;
        _transfers = transfers;
    }

    public async Task<InventoryItem?> GetAsync(Guid productId)
        => await _items.GetByProductIdAsync(productId);

    public async Task<IEnumerable<InventoryItem>> GetLowStockAsync()
        => await _items.GetLowStockAsync();

    public async Task<InventoryItem> AdjustAsync(Guid productId, int delta, string reason)
    {
        var item = await _items.GetByProductIdAsync(productId)
            ?? new InventoryItem { ProductId = productId, Quantity = 0, ReorderLevel = 5, UpdatedAt = DateTime.UtcNow };

        var before = item.Quantity;
        item.Quantity += delta;
        item.UpdatedAt = DateTime.UtcNow;
        await _items.UpsertAsync(item);

        await _movements.AddAsync(new InventoryMovement
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            QuantityBefore = before,
            QuantityAfter = item.Quantity,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        });

        return item;
    }

    public async Task<InventoryItem> CountAsync(Guid productId, int quantity)
    {
        var item = await _items.GetByProductIdAsync(productId)
            ?? new InventoryItem { ProductId = productId, Quantity = 0, ReorderLevel = 5, UpdatedAt = DateTime.UtcNow };

        var before = item.Quantity;
        item.Quantity = quantity;
        item.UpdatedAt = DateTime.UtcNow;
        await _items.UpsertAsync(item);

        await _movements.AddAsync(new InventoryMovement
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            QuantityBefore = before,
            QuantityAfter = item.Quantity,
            Reason = "Count",
            CreatedAt = DateTime.UtcNow
        });

        return item;
    }

    public async Task<IEnumerable<InventoryMovement>> HistoryAsync(Guid productId)
        => await _movements.GetByProductIdAsync(productId);

    public async Task<InventoryTransfer> TransferAsync(Guid productId, int quantity, Guid fromWarehouse, Guid toWarehouse)
    {
        var transfer = new InventoryTransfer
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Quantity = quantity,
            FromWarehouseId = fromWarehouse,
            ToWarehouseId = toWarehouse,
            Status = "Recorded",
            CreatedAt = DateTime.UtcNow
        };

        await _transfers.AddAsync(transfer);
        return transfer;
    }
}
