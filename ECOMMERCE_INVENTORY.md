# INVENTORY MANAGEMENT SYSTEM - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Stock management, low stock alerts, reorder automation, inventory history

---

## 1. INVENTORY ENTITIES & DATABASE SCHEMA

### 1.1 Domain Model

```csharp
// Domain/Entities/Inventory.cs
public class Inventory
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public Guid WarehouseId { get; set; }
  public int Quantity { get; set; }
  public int ReorderLevel { get; set; }           // Threshold for low stock
  public int ReorderQuantity { get; set; }        // How much to order
  public InventoryStatus Status { get; set; }
  
  // Tracking
  public DateTime LastCountedAt { get; set; }
  public DateTime? LastReorderedAt { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  
  // Navigation
  public Product Product { get; set; }
  public Warehouse Warehouse { get; set; }
}

public enum InventoryStatus
{
  Active,
  LowStock,           // Quantity <= ReorderLevel
  OutOfStock,         // Quantity = 0
  Discontinued,
  Damaged
}

// Inventory movements (audit trail)
public class InventoryMovement
{
  public Guid Id { get; set; }
  public Guid InventoryId { get; set; }
  public InventoryMovementType Type { get; set; }
  public int QuantityChanged { get; set; }        // Positive or negative
  public int QuantityBefore { get; set; }
  public int QuantityAfter { get; set; }
  public string Reason { get; set; }
  public string Reference { get; set; }           // Order ID, Adjustment ID, etc
  public Guid CreatedByUserId { get; set; }
  public DateTime CreatedAt { get; set; }
  
  // Navigation
  public Inventory Inventory { get; set; }
  public User CreatedByUser { get; set; }
}

public enum InventoryMovementType
{
  Purchase,          // Stock received (PO)
  Sale,              // Stock sold (Order)
  Adjustment,        // Manual adjustment
  Return,            // Customer return
  Damage,            // Damaged stock
  Expire,            // Expiration
  Transfer,          // Transfer between warehouses
  Reorder,           // Auto-reorder
  Reversal           // Refund reversal
}

// Reorder requests (auto-generated)
public class ReorderRequest
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public Guid SupplierId { get; set; }
  public int Quantity { get; set; }
  public ReorderStatus Status { get; set; }
  public decimal EstimatedCost { get; set; }
  public DateTime RequestedAt { get; set; }
  public DateTime? ApprovedAt { get; set; }
  public DateTime? ReceivedAt { get; set; }
  public string PurchaseOrderNumber { get; set; }
  
  // Navigation
  public Product Product { get; set; }
  public Supplier Supplier { get; set; }
}

public enum ReorderStatus
{
  Pending,           // Awaiting approval
  Approved,          // Approved by admin
  Ordered,           // Sent to supplier
  Received,          // Inventory received
  Cancelled
}

// Warehouse model
public class Warehouse
{
  public Guid Id { get; set; }
  public string Name { get; set; }
  public string Location { get; set; }
  public bool IsActive { get; set; }
  public List<Inventory> Inventory { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,         -- Low stock threshold
  reorder_quantity INT NOT NULL DEFAULT 100,     -- How much to reorder
  status VARCHAR(50) NOT NULL DEFAULT 'Active',  -- Active, LowStock, OutOfStock
  last_counted_at TIMESTAMP,
  last_reordered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(product_id, warehouse_id),
  CONSTRAINT quantity_not_negative CHECK (quantity >= 0),
  CONSTRAINT reorder_level_positive CHECK (reorder_level >= 0),
  CONSTRAINT reorder_qty_positive CHECK (reorder_quantity > 0)
);

CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity, reorder_level) 
  WHERE status = 'LowStock';

-- Inventory movements (audit trail)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL,                      -- Purchase, Sale, Adjustment, etc
  quantity_changed INT NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  reason VARCHAR(255),
  reference VARCHAR(255),                         -- Order/Refund/Adjustment ID
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT movement_math_check CHECK (quantity_before + quantity_changed = quantity_after)
);

CREATE INDEX idx_movements_inventory_id ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_type ON inventory_movements(type);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_movements_reference ON inventory_movements(reference);

-- Reorder requests
CREATE TABLE reorder_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  status VARCHAR(50) NOT NULL,                    -- Pending, Approved, Ordered, Received
  estimated_cost DECIMAL(10, 2),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  received_at TIMESTAMP,
  purchase_order_number VARCHAR(255),
  
  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_reorders_product_id ON reorder_requests(product_id);
CREATE INDEX idx_reorders_supplier_id ON reorder_requests(supplier_id);
CREATE INDEX idx_reorders_status ON reorder_requests(status);
```

---

## 2. INVENTORY SERVICE

```csharp
// Application/Services/InventoryService.cs
public interface IInventoryService
{
  Task<InventoryDto> GetByProductAsync(Guid productId, Guid? warehouseId = null);
  Task<InventoryDto> UpdateStockAsync(Guid productId, int quantityChange, string reason, string referenceId = null);
  Task<IEnumerable<InventoryDto>> GetLowStockProductsAsync();
  Task<IEnumerable<InventoryMovementDto>> GetMovementHistoryAsync(Guid productId, int days = 30);
  Task<InventoryCountDto> PerformInventoryCountAsync(Guid productId, int actualCount);
  Task AutoReorderAsync();
  Task TransferStockAsync(Guid productId, Guid fromWarehouse, Guid toWarehouse, int quantity);
}

public class InventoryService : IInventoryService
{
  private readonly IInventoryRepository _inventoryRepository;
  private readonly IInventoryMovementRepository _movementRepository;
  private readonly IReorderRequestRepository _reorderRepository;
  private readonly IProductRepository _productRepository;
  private readonly IEmailService _emailService;
  private readonly IAuditService _auditService;
  private readonly ILogger<InventoryService> _logger;

  public InventoryService(
    IInventoryRepository inventoryRepository,
    IInventoryMovementRepository movementRepository,
    IReorderRequestRepository reorderRepository,
    IProductRepository productRepository,
    IEmailService emailService,
    IAuditService auditService,
    ILogger<InventoryService> logger)
  {
    _inventoryRepository = inventoryRepository;
    _movementRepository = movementRepository;
    _reorderRepository = reorderRepository;
    _productRepository = productRepository;
    _emailService = emailService;
    _auditService = auditService;
    _logger = logger;
  }

  // 1. GET INVENTORY BY PRODUCT
  public async Task<InventoryDto> GetByProductAsync(Guid productId, Guid? warehouseId = null)
  {
    Inventory inventory;

    if (warehouseId.HasValue)
    {
      inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId.Value);
    }
    else
    {
      // Get total from all warehouses
      var inventories = await _inventoryRepository.GetByProductAsync(productId);
      var totalQty = inventories.Sum(x => x.Quantity);
      
      if (inventories.Any())
      {
        inventory = inventories.First();
        inventory.Quantity = totalQty;
      }
      else
      {
        return null;
      }
    }

    return MapToDto(inventory);
  }

  // 2. UPDATE STOCK (Core operation)
  public async Task<InventoryDto> UpdateStockAsync(
    Guid productId,
    int quantityChange,
    string reason,
    string referenceId = null,
    Guid? userId = null)
  {
    using (var transaction = await _inventoryRepository.BeginTransactionAsync())
    {
      try
      {
        var inventory = await _inventoryRepository.GetByProductAsync(productId);
        if (inventory == null)
          throw new NotFoundException("Inventory not found");

        var oldQty = inventory.Quantity;
        var newQty = oldQty + quantityChange;

        if (newQty < 0)
          throw new DomainException($"Cannot reduce stock below zero. Current: {oldQty}, Change: {quantityChange}");

        // Update inventory quantity
        inventory.Quantity = newQty;
        inventory.UpdatedAt = DateTime.UtcNow;

        // Update status based on quantity
        if (newQty == 0)
          inventory.Status = InventoryStatus.OutOfStock;
        else if (newQty <= inventory.ReorderLevel)
          inventory.Status = InventoryStatus.LowStock;
        else
          inventory.Status = InventoryStatus.Active;

        await _inventoryRepository.UpdateAsync(inventory);

        // Record movement
        var movement = new InventoryMovement
        {
          InventoryId = inventory.Id,
          Type = GetMovementType(reason),
          QuantityChanged = quantityChange,
          QuantityBefore = oldQty,
          QuantityAfter = newQty,
          Reason = reason,
          Reference = referenceId,
          CreatedByUserId = userId ?? Guid.NewGuid(),  // System user if not specified
          CreatedAt = DateTime.UtcNow
        };

        await _movementRepository.AddAsync(movement);

        // Alert if low stock
        if (inventory.Status == InventoryStatus.LowStock)
        {
          await AlertLowStockAsync(inventory);
        }

        // Auto-reorder if enabled
        if (inventory.Status == InventoryStatus.LowStock)
        {
          await CreateAutoReorderAsync(inventory);
        }

        await transaction.CommitAsync();

        _logger.LogInformation(
          "Stock updated for product {productId}: {oldQty} -> {newQty} ({reason})",
          productId, oldQty, newQty, reason);

        return MapToDto(inventory);
      }
      catch
      {
        await transaction.RollbackAsync();
        throw;
      }
    }
  }

  // 3. GET LOW STOCK PRODUCTS
  public async Task<IEnumerable<InventoryDto>> GetLowStockProductsAsync()
  {
    var lowStockItems = await _inventoryRepository.GetAsync(
      predicate: x => x.Status == InventoryStatus.LowStock,
      orderBy: q => q.OrderBy(x => x.Quantity)
    );

    return lowStockItems.Select(MapToDto);
  }

  // 4. GET MOVEMENT HISTORY
  public async Task<IEnumerable<InventoryMovementDto>> GetMovementHistoryAsync(
    Guid productId,
    int days = 30)
  {
    var history = await _movementRepository.GetAsync(
      predicate: x =>
        x.Inventory.ProductId == productId &&
        x.CreatedAt >= DateTime.UtcNow.AddDays(-days),
      orderBy: q => q.OrderByDescending(x => x.CreatedAt),
      pageSize: 1000
    );

    return history.Select(x => new InventoryMovementDto
    {
      Id = x.Id,
      Type = x.Type.ToString(),
      QuantityChanged = x.QuantityChanged,
      QuantityBefore = x.QuantityBefore,
      QuantityAfter = x.QuantityAfter,
      Reason = x.Reason,
      Reference = x.Reference,
      CreatedBy = x.CreatedByUser.Name,
      CreatedAt = x.CreatedAt
    });
  }

  // 5. INVENTORY COUNT (Physical counting)
  public async Task<InventoryCountDto> PerformInventoryCountAsync(
    Guid productId,
    int actualCount)
  {
    var inventory = await _inventoryRepository.GetByProductAsync(productId);
    if (inventory == null)
      throw new NotFoundException("Inventory not found");

    var systemCount = inventory.Quantity;
    var discrepancy = actualCount - systemCount;

    // Record adjustment
    if (discrepancy != 0)
    {
      await UpdateStockAsync(
        productId,
        quantityChange: discrepancy,
        reason: "Inventory count adjustment",
        referenceId: $"COUNT-{DateTime.UtcNow:yyyyMMddHHmmss}"
      );
    }

    inventory.LastCountedAt = DateTime.UtcNow;
    await _inventoryRepository.UpdateAsync(inventory);

    // Alert if significant discrepancy
    if (Math.Abs(discrepancy) > systemCount * 0.1)  // 10% tolerance
    {
      _logger.LogWarning(
        "Inventory discrepancy for product {productId}: system={system}, actual={actual}, diff={diff}",
        productId, systemCount, actualCount, discrepancy);

      await _emailService.SendAsync(
        adminEmail: "admin@loja.com.br",
        subject: "⚠️ Inventory Discrepancy Detected",
        template: "InventoryDiscrepancy",
        data: new { productId, systemCount, actualCount, discrepancy }
      );
    }

    return new InventoryCountDto
    {
      ProductId = productId,
      SystemCount = systemCount,
      ActualCount = actualCount,
      Discrepancy = discrepancy,
      DiscrepancyPercent = systemCount > 0 ? (discrepancy / (float)systemCount) * 100 : 0,
      CountedAt = DateTime.UtcNow
    };
  }

  // 6. ADD STOCK (simplified)
  public async Task AddStockAsync(
    Guid productId,
    int quantity,
    string reason,
    string referenceId = null)
  {
    await UpdateStockAsync(productId, quantity, reason, referenceId);
  }

  // 7. AUTO REORDER
  public async Task AutoReorderAsync()
  {
    var lowStockItems = await GetLowStockProductsAsync();

    foreach (var item in lowStockItems)
    {
      // Check if reorder already exists
      var existingReorder = await _reorderRepository.GetPendingByProductAsync(
        Guid.Parse(item.ProductId.ToString())
      );

      if (existingReorder == null)
      {
        await CreateAutoReorderAsync(item);
      }
    }

    _logger.LogInformation("Auto-reorder completed");
  }

  private async Task CreateAutoReorderAsync(Inventory inventory)
  {
    var product = await _productRepository.GetByIdAsync(inventory.ProductId);
    
    // Get default supplier (assuming each product has one)
    if (product?.DefaultSupplierId == null)
      return;

    var reorderRequest = new ReorderRequest
    {
      ProductId = inventory.ProductId,
      SupplierId = product.DefaultSupplierId.Value,
      Quantity = inventory.ReorderQuantity,
      Status = ReorderStatus.Pending,
      EstimatedCost = product.CostPrice * inventory.ReorderQuantity,
      RequestedAt = DateTime.UtcNow
    };

    await _reorderRepository.AddAsync(reorderRequest);

    // Notify admin
    await _emailService.SendAsync(
      adminEmail: "admin@loja.com.br",
      subject: $"Auto-Reorder Created - {product.Name}",
      template: "AutoReorderNotification",
      data: new { product, reorderRequest }
    );

    _logger.LogInformation(
      "Auto-reorder created for product {productId}, qty={qty}",
      inventory.ProductId, inventory.ReorderQuantity);
  }

  // 8. TRANSFER STOCK (between warehouses)
  public async Task TransferStockAsync(
    Guid productId,
    Guid fromWarehouse,
    Guid toWarehouse,
    int quantity)
  {
    using (var transaction = await _inventoryRepository.BeginTransactionAsync())
    {
      try
      {
        // Reduce from source
        await UpdateStockAsync(
          productId,
          quantityChange: -quantity,
          reason: "Transfer out",
          referenceId: $"TRANSFER-FROM-{fromWarehouse}"
        );

        // Add to destination
        await UpdateStockAsync(
          productId,
          quantityChange: quantity,
          reason: "Transfer in",
          referenceId: $"TRANSFER-TO-{toWarehouse}"
        );

        await transaction.CommitAsync();

        _logger.LogInformation(
          "Stock transferred: product={productId}, from={from}, to={to}, qty={qty}",
          productId, fromWarehouse, toWarehouse, quantity);
      }
      catch
      {
        await transaction.RollbackAsync();
        throw;
      }
    }
  }

  private async Task AlertLowStockAsync(Inventory inventory)
  {
    var product = await _productRepository.GetByIdAsync(inventory.ProductId);

    await _emailService.SendAsync(
      adminEmail: "admin@loja.com.br",
      subject: $"Low Stock Alert - {product.Name}",
      template: "LowStockAlert",
      data: new
      {
        product,
        CurrentStock = inventory.Quantity,
        ReorderLevel = inventory.ReorderLevel,
        ReorderQuantity = inventory.ReorderQuantity
      }
    );
  }

  private InventoryMovementType GetMovementType(string reason)
  {
    return reason.ToLower() switch
    {
      var s when s.Contains("sale") || s.Contains("order") => InventoryMovementType.Sale,
      var s when s.Contains("purchase") || s.Contains("received") => InventoryMovementType.Purchase,
      var s when s.Contains("return") => InventoryMovementType.Return,
      var s when s.Contains("refund") => InventoryMovementType.Reversal,
      var s when s.Contains("damage") => InventoryMovementType.Damage,
      var s when s.Contains("expire") => InventoryMovementType.Expire,
      var s when s.Contains("transfer") => InventoryMovementType.Transfer,
      var s when s.Contains("reorder") => InventoryMovementType.Reorder,
      _ => InventoryMovementType.Adjustment
    };
  }

  private InventoryDto MapToDto(Inventory inv) => new InventoryDto
  {
    ProductId = inv.ProductId,
    WarehouseId = inv.WarehouseId,
    Quantity = inv.Quantity,
    Status = inv.Status.ToString(),
    ReorderLevel = inv.ReorderLevel,
    ReorderQuantity = inv.ReorderQuantity,
    LastCountedAt = inv.LastCountedAt
  };
}
```

---

## 3. API ENDPOINTS

```csharp
[ApiController]
[Route("api/v1/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
  private readonly IInventoryService _inventoryService;

  // GET /api/v1/inventory/{productId}
  [HttpGet("{productId}")]
  public async Task<IActionResult> GetInventory(Guid productId, [FromQuery] Guid? warehouseId = null)
  {
    var result = await _inventoryService.GetByProductAsync(productId, warehouseId);
    return Ok(result);
  }

  // GET /api/v1/inventory/low-stock
  [HttpGet("low-stock")]
  [Authorize(Roles = "AdminInventory,AdminGeneral")]
  public async Task<IActionResult> GetLowStockProducts()
  {
    var result = await _inventoryService.GetLowStockProductsAsync();
    return Ok(result);
  }

  // POST /api/v1/inventory/{productId}/adjust
  [HttpPost("{productId}/adjust")]
  [Authorize(Roles = "AdminInventory,AdminGeneral")]
  public async Task<IActionResult> AdjustStock(Guid productId, [FromBody] AdjustStockRequest request)
  {
    var userId = User.GetUserId();
    var result = await _inventoryService.UpdateStockAsync(
      productId,
      request.QuantityChange,
      request.Reason,
      referenceId: request.ReferenceId,
      userId: userId
    );
    return Ok(result);
  }

  // POST /api/v1/inventory/{productId}/count
  [HttpPost("{productId}/count")]
  [Authorize(Roles = "AdminInventory,AdminGeneral")]
  public async Task<IActionResult> InventoryCount(Guid productId, [FromBody] InventoryCountRequest request)
  {
    var result = await _inventoryService.PerformInventoryCountAsync(productId, request.ActualCount);
    return Ok(result);
  }

  // GET /api/v1/inventory/{productId}/history
  [HttpGet("{productId}/history")]
  [Authorize(Roles = "AdminInventory,AdminGeneral")]
  public async Task<IActionResult> GetMovementHistory(Guid productId, [FromQuery] int days = 30)
  {
    var result = await _inventoryService.GetMovementHistoryAsync(productId, days);
    return Ok(result);
  }

  // POST /api/v1/inventory/transfer
  [HttpPost("transfer")]
  [Authorize(Roles = "AdminInventory,AdminGeneral")]
  public async Task<IActionResult> TransferStock([FromBody] TransferStockRequest request)
  {
    await _inventoryService.TransferStockAsync(
      request.ProductId,
      request.FromWarehouse,
      request.ToWarehouse,
      request.Quantity
    );
    return Ok(new { message = "Stock transferred" });
  }
}
```

---

## 4. INVENTORY DASHBOARD (Admin)

```typescript
// src/app/(admin)/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function InventoryPage() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: '',
    quantityChange: 0,
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLowStockItems();
  }, []);

  const loadLowStockItems = async () => {
    try {
      const response = await api.get('/inventory/low-stock');
      setLowStockItems(response.data);
    } catch (err) {
      console.error('Failed to load low stock items', err);
    }
  };

  const handleAdjustStock = async () => {
    setLoading(true);
    try {
      await api.post(`/inventory/${adjustmentForm.productId}/adjust`, {
        quantityChange: adjustmentForm.quantityChange,
        reason: adjustmentForm.reason
      });

      // Reload list
      loadLowStockItems();
      setAdjustmentForm({ productId: '', quantityChange: 0, reason: '' });
      alert('Stock adjusted successfully');
    } catch (err) {
      console.error('Failed to adjust stock', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Management</h1>

      {/* Low Stock Items */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Low Stock Items</h2>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Product</th>
              <th className="text-center py-2">Current Stock</th>
              <th className="text-center py-2">Reorder Level</th>
              <th className="text-center py-2">Status</th>
              <th className="text-center py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map(item => (
              <tr key={item.productId} className="border-b hover:bg-gray-50">
                <td className="py-3">{item.productName}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{item.reorderLevel}</td>
                <td className="text-center">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
                    {item.status}
                  </span>
                </td>
                <td className="text-center">
                  <button
                    onClick={() => {
                      setAdjustmentForm({
                        productId: item.productId,
                        quantityChange: item.reorderQuantity,
                        reason: 'Restock'
                      });
                    }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Form */}
      {adjustmentForm.productId && (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Adjust Stock</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity Change</label>
              <input
                type="number"
                value={adjustmentForm.quantityChange}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    quantityChange: parseInt(e.target.value) || 0
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <select
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    reason: e.target.value
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option>Restock</option>
                <option>Damage</option>
                <option>Expired</option>
                <option>Count Adjustment</option>
              </select>
            </div>

            <button
              onClick={handleAdjustStock}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Adjust Stock'}
            </button>

            <button
              onClick={() => setAdjustmentForm({ productId: '', quantityChange: 0, reason: '' })}
              className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 5. INVENTORY CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: warehouses table
- [ ] Migration: inventory table
- [ ] Migration: inventory_movements table
- [ ] Migration: reorder_requests table
- [ ] Indexes created
- [ ] Constraints enforced

### Backend
- [ ] Inventory entity
- [ ] InventoryMovement entity
- [ ] ReorderRequest entity
- [ ] Warehouse entity
- [ ] IInventoryService interface
- [ ] InventoryService implementation
- [ ] InventoryController
- [ ] Auto-reorder job (Hangfire)
- [ ] Inventory counting logic

### API Endpoints
- [ ] GET /inventory/{productId}
- [ ] GET /inventory/low-stock
- [ ] POST /inventory/{productId}/adjust
- [ ] POST /inventory/{productId}/count
- [ ] GET /inventory/{productId}/history
- [ ] POST /inventory/transfer

### Features
- [ ] Real-time stock updates
- [ ] Low stock alerts (email)
- [ ] Auto-reorder generation
- [ ] Inventory counting
- [ ] Movement history tracking
- [ ] Multi-warehouse support
- [ ] Stock transfers between warehouses
- [ ] Discrepancy detection

### Frontend
- [ ] Low stock dashboard
- [ ] Stock adjustment form
- [ ] Inventory count interface
- [ ] Movement history viewer
- [ ] Transfer interface

### Testing
- [ ] Unit: Stock calculations
- [ ] Unit: Movement types
- [ ] Integration: Stock updates
- [ ] Integration: Low stock alerts
- [ ] E2E: Full inventory workflow
- [ ] E2E: Auto-reorder trigger

### Monitoring
- [ ] Low stock report
- [ ] Inventory discrepancy alerts
- [ ] Reorder status tracking
- [ ] Movement audit log
```

---

**Inventory Management System Completo ✅**
