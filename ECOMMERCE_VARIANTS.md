# PRODUCT VARIANTS & SKU MANAGEMENT - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Variações de produtos, SKU, estoque por variante, preço dinâmico

---

## 1. VARIANT ENTITIES

### 1.1 Domain Model

```csharp
// Domain/Entities/Product/ProductVariant.cs
public class ProductVariant
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public string SKU { get; set; }                    // Unique identifier
  public string Name { get; set; }                   // "Red - Large"
  
  // Price override
  public decimal? PriceOverride { get; set; }        // null = use product base price
  public decimal? CostPrice { get; set; }            // For margin calculation
  
  // Stock
  public int StockQuantity { get; set; }
  public int ReorderLevel { get; set; }
  public string WarehouseLocation { get; set; }      // Bin/location
  
  // Images
  public List<VariantImage> Images { get; set; }
  public string PrimaryImageUrl { get; set; }
  
  // Attributes mapping
  public Dictionary<string, string> AttributeValues { get; set; }
  // Example: { "Color": "Red", "Size": "Large", "Material": "Cotton" }
  
  // Status
  public VariantStatus Status { get; set; }         // Active, Discontinued, ComingSoon
  public DateTime CreatedAt { get; set; }
  public DateTime? DiscontinuedAt { get; set; }
  
  // Relations
  public Product Product { get; set; }
  public List<OrderItem> OrderItems { get; set; }
  public List<CartItem> CartItems { get; set; }
}

public enum VariantStatus
{
  Active,
  Discontinued,
  ComingSoon,
  OutOfStock
}

// Variant image
public class VariantImage
{
  public Guid Id { get; set; }
  public Guid VariantId { get; set; }
  public string ImageUrl { get; set; }
  public string AltText { get; set; }
  public int DisplayOrder { get; set; }
  public bool IsPrimary { get; set; }
  
  public ProductVariant Variant { get; set; }
}

// Variant attribute definition (Admin defines what attributes exist)
public class VariantAttribute
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public string Name { get; set; }                   // "Size", "Color", "Material"
  public VariantAttributeType Type { get; set; }
  public List<string> AllowedValues { get; set; }   // ["S", "M", "L", "XL"]
  public int DisplayOrder { get; set; }
  public bool IsRequired { get; set; } = true;
  
  public Product Product { get; set; }
}

public enum VariantAttributeType
{
  Dropdown,           // Size: S, M, L, XL
  Color,              // Color picker
  Text,               // Custom text
  MultiSelect        // Checkboxes
}

// SKU barcode mapping
public class SKUBarcode
{
  public Guid Id { get; set; }
  public Guid VariantId { get; set; }
  public string Barcode { get; set; }                // EAN-13, UPC, etc
  public string BarcodeFormat { get; set; }          // "EAN13", "UPC", "CODE128"
  public DateTime CreatedAt { get; set; }
  
  public ProductVariant Variant { get; set; }
}

// Variant price history (for analytics)
public class VariantPriceHistory
{
  public Guid Id { get; set; }
  public Guid VariantId { get; set; }
  public decimal OldPrice { get; set; }
  public decimal NewPrice { get; set; }
  public DateTime ChangedAt { get; set; }
  public string Reason { get; set; }                 // "Promotion", "Cost increase", etc
  
  public ProductVariant Variant { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Variant attributes definition
CREATE TABLE variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,              -- Dropdown, Color, Text, MultiSelect
  allowed_values TEXT[],                  -- JSON array of allowed values
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_variant_attrs_product_name ON variant_attributes(product_id, name);

-- Product variants
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  price_override DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  stock_quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  warehouse_location VARCHAR(100),
  primary_image_url VARCHAR(500),
  attribute_values JSONB,                 -- { "Color": "Red", "Size": "Large" }
  status VARCHAR(50) DEFAULT 'Active',    -- Active, Discontinued, ComingSoon, OutOfStock
  created_at TIMESTAMP DEFAULT NOW(),
  discontinued_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_status ON product_variants(status);

-- Variant images
CREATE TABLE variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variant_images_variant_id ON variant_images(variant_id);

-- SKU barcodes
CREATE TABLE sku_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  barcode VARCHAR(50) NOT NULL UNIQUE,
  barcode_format VARCHAR(50),             -- EAN13, UPC, CODE128
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_barcode_unique ON sku_barcodes(barcode);
CREATE INDEX idx_barcode_variant_id ON sku_barcodes(variant_id);

-- Price history
CREATE TABLE variant_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(255)
);

CREATE INDEX idx_price_history_variant_id ON variant_price_history(variant_id);
CREATE INDEX idx_price_history_date ON variant_price_history(changed_at DESC);
```

---

## 2. VARIANT SERVICE

```csharp
// Application/Services/VariantService.cs
public interface IVariantService
{
  Task<ProductVariantDto> GetBySkuAsync(string sku);
  Task<ProductVariantDto> GetByIdAsync(Guid id);
  Task<IEnumerable<ProductVariantDto>> GetByProductAsync(Guid productId);
  Task<ProductVariantDto> CreateVariantAsync(CreateVariantDto dto);
  Task<ProductVariantDto> UpdateVariantAsync(Guid id, UpdateVariantDto dto);
  Task DeleteVariantAsync(Guid id);
  Task<ProductVariantDto> UpdateStockAsync(Guid id, int quantity, string reason);
  Task<bool> IsSkuAvailableAsync(string sku, Guid? excludeVariantId = null);
  Task<IEnumerable<ProductVariantDto>> GetLowStockVariantsAsync(int threshold = 10);
  Task SyncBarcodesAsync(Guid variantId, List<string> barcodes);
  Task<decimal> GetEffectivePriceAsync(Guid variantId);
}

public class VariantService : IVariantService
{
  private readonly IVariantRepository _variantRepository;
  private readonly IProductRepository _productRepository;
  private readonly IVariantAttributeRepository _attributeRepository;
  private readonly IMapper _mapper;
  private readonly ILogger<VariantService> _logger;

  public VariantService(
    IVariantRepository variantRepository,
    IProductRepository productRepository,
    IVariantAttributeRepository attributeRepository,
    IMapper mapper,
    ILogger<VariantService> logger)
  {
    _variantRepository = variantRepository;
    _productRepository = productRepository;
    _attributeRepository = attributeRepository;
    _mapper = mapper;
    _logger = logger;
  }

  // 1. GET BY SKU (common in POS, inventory)
  public async Task<ProductVariantDto> GetBySkuAsync(string sku)
  {
    if (string.IsNullOrWhiteSpace(sku))
      throw new ValidationException("SKU cannot be empty");

    var variant = await _variantRepository.GetBySKUAsync(sku);
    if (variant == null)
      throw new NotFoundException($"Variant with SKU '{sku}' not found");

    return _mapper.Map<ProductVariantDto>(variant);
  }

  // 2. CREATE VARIANT
  public async Task<ProductVariantDto> CreateVariantAsync(CreateVariantDto dto)
  {
    // Validate SKU uniqueness
    var existingVariant = await _variantRepository.GetBySKUAsync(dto.SKU);
    if (existingVariant != null)
      throw new ValidationException($"SKU '{dto.SKU}' already exists");

    // Validate product exists
    var product = await _productRepository.GetByIdAsync(dto.ProductId);
    if (product == null)
      throw new NotFoundException("Product not found");

    // Validate attributes
    var attributes = await _attributeRepository.GetByProductAsync(dto.ProductId);
    ValidateAttributeValues(dto.AttributeValues, attributes);

    var variant = new ProductVariant
    {
      ProductId = dto.ProductId,
      SKU = dto.SKU.ToUpper().Trim(),
      Name = GenerateVariantName(dto.AttributeValues),
      PriceOverride = dto.PriceOverride,
      CostPrice = dto.CostPrice,
      StockQuantity = dto.StockQuantity,
      ReorderLevel = dto.ReorderLevel,
      AttributeValues = dto.AttributeValues,
      Status = VariantStatus.Active,
      CreatedAt = DateTime.UtcNow
    };

    await _variantRepository.AddAsync(variant);
    _logger.LogInformation("Variant created: {sku}", variant.SKU);

    return _mapper.Map<ProductVariantDto>(variant);
  }

  // 3. UPDATE STOCK
  public async Task<ProductVariantDto> UpdateStockAsync(Guid id, int quantity, string reason)
  {
    var variant = await _variantRepository.GetByIdAsync(id);
    if (variant == null)
      throw new NotFoundException("Variant not found");

    var oldQuantity = variant.StockQuantity;
    variant.StockQuantity = Math.Max(0, quantity);

    // Check reorder
    if (variant.StockQuantity <= variant.ReorderLevel && oldQuantity > variant.ReorderLevel)
    {
      _logger.LogWarning("Low stock alert for variant {sku}", variant.SKU);
      // TODO: Trigger low stock notification
    }

    await _variantRepository.UpdateAsync(variant);

    // Log movement
    await LogStockMovementAsync(variant.Id, oldQuantity, quantity, reason);

    return _mapper.Map<ProductVariantDto>(variant);
  }

  // 4. GET EFFECTIVE PRICE (considers overrides, promotions, etc)
  public async Task<decimal> GetEffectivePriceAsync(Guid variantId)
  {
    var variant = await _variantRepository.GetByIdAsync(variantId);
    if (variant == null)
      throw new NotFoundException("Variant not found");

    // Priority: Variant override > Product base price
    if (variant.PriceOverride.HasValue)
      return variant.PriceOverride.Value;

    var product = await _productRepository.GetByIdAsync(variant.ProductId);
    return product?.Price ?? 0;
  }

  // 5. GET LOW STOCK VARIANTS
  public async Task<IEnumerable<ProductVariantDto>> GetLowStockVariantsAsync(int threshold = 10)
  {
    var variants = await _variantRepository.GetAsync(
      predicate: x => x.StockQuantity <= threshold && x.Status == VariantStatus.Active,
      orderBy: q => q.OrderBy(x => x.StockQuantity)
    );

    return _mapper.Map<IEnumerable<ProductVariantDto>>(variants);
  }

  // 6. SYNC BARCODES
  public async Task SyncBarcodesAsync(Guid variantId, List<string> barcodes)
  {
    var variant = await _variantRepository.GetByIdAsync(variantId);
    if (variant == null)
      throw new NotFoundException("Variant not found");

    // Remove old barcodes
    await _variantRepository.RemoveBarcodesAsync(variantId);

    // Add new barcodes
    foreach (var barcode in barcodes)
    {
      var skuBarcode = new SKUBarcode
      {
        VariantId = variantId,
        Barcode = barcode,
        BarcodeFormat = DetectBarcodeFormat(barcode)
      };

      await _variantRepository.AddBarcodeAsync(skuBarcode);
    }

    _logger.LogInformation("Barcodes synced for variant {id}: {count} codes", variantId, barcodes.Count);
  }

  // Helper methods
  private void ValidateAttributeValues(Dictionary<string, string> values, IEnumerable<VariantAttribute> attributes)
  {
    foreach (var attr in attributes.Where(x => x.IsRequired))
    {
      if (!values.ContainsKey(attr.Name))
        throw new ValidationException($"Required attribute '{attr.Name}' is missing");

      if (attr.AllowedValues != null && attr.AllowedValues.Any())
      {
        if (!attr.AllowedValues.Contains(values[attr.Name]))
          throw new ValidationException(
            $"Invalid value for '{attr.Name}': {values[attr.Name]}. Allowed: {string.Join(", ", attr.AllowedValues)}"
          );
      }
    }
  }

  private string GenerateVariantName(Dictionary<string, string> attributes)
  {
    var parts = attributes.Values.ToList();
    return string.Join(" - ", parts);
  }

  private string DetectBarcodeFormat(string barcode)
  {
    return barcode.Length switch
    {
      12 => "UPC",
      13 => "EAN13",
      _ => "CODE128"
    };
  }

  private async Task LogStockMovementAsync(Guid variantId, int oldQty, int newQty, string reason)
  {
    // Implementation similar to ECOMMERCE_INVENTORY.md
  }
}
```

---

## 3. VARIANT API & FRONTEND

```typescript
// Backend - API Controller
[ApiController]
[Route("api/v1/variants")]
public class VariantsController : ControllerBase
{
  private readonly IVariantService _service;

  [HttpGet("sku/{sku}")]
  [AllowAnonymous]
  public async Task<ActionResult<ProductVariantDto>> GetBySku(string sku)
  {
    var variant = await _service.GetBySkuAsync(sku);
    return Ok(variant);
  }

  [HttpGet("product/{productId}")]
  [AllowAnonymous]
  public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetByProduct(Guid productId)
  {
    var variants = await _service.GetByProductAsync(productId);
    return Ok(variants);
  }

  [HttpPost]
  [Authorize(Roles = "Admin")]
  public async Task<ActionResult<ProductVariantDto>> Create(CreateVariantDto dto)
  {
    var variant = await _service.CreateVariantAsync(dto);
    return CreatedAtAction(nameof(GetById), new { id = variant.Id }, variant);
  }

  [HttpPut("{id}")]
  [Authorize(Roles = "Admin")]
  public async Task<ActionResult<ProductVariantDto>> Update(Guid id, UpdateVariantDto dto)
  {
    var variant = await _service.UpdateVariantAsync(id, dto);
    return Ok(variant);
  }

  [HttpPatch("{id}/stock")]
  [Authorize(Roles = "Admin")]
  public async Task<ActionResult<ProductVariantDto>> UpdateStock(Guid id, UpdateStockDto dto)
  {
    var variant = await _service.UpdateStockAsync(id, dto.Quantity, dto.Reason);
    return Ok(variant);
  }

  [HttpDelete("{id}")]
  [Authorize(Roles = "Admin")]
  public async Task<IActionResult> Delete(Guid id)
  {
    await _service.DeleteVariantAsync(id);
    return NoContent();
  }

  [HttpGet("low-stock")]
  [Authorize(Roles = "Admin")]
  public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetLowStock(int threshold = 10)
  {
    var variants = await _service.GetLowStockVariantsAsync(threshold);
    return Ok(variants);
  }
}
```

```typescript
// Frontend - Product Detail with Variants
'use client';

import { useState, useMemo } from 'react';
import { useProductVariants } from '@/hooks/useProductVariants';

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const { variants, attributes, loading } = useProductVariants(productId);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Find matching variant based on selected attributes
  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;

    return variants.find(v =>
      Object.entries(selectedAttributes).every(
        ([key, value]) => v.attributeValues[key] === value
      )
    );
  }, [variants, selectedAttributes]);

  const handleAttributeChange = (attrName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attrName]: value
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Product Images */}
      <div className="grid grid-cols-2 gap-4">
        {selectedVariant?.images.map(img => (
          <img
            key={img.id}
            src={img.imageUrl}
            alt={img.altText}
            className="w-full rounded border"
          />
        )) || <div className="bg-gray-200 rounded h-96" />}
      </div>

      {/* Variant Selection */}
      <div className="space-y-4">
        {attributes.map(attr => (
          <div key={attr.id}>
            <label className="block font-semibold mb-2">{attr.name}</label>
            
            {attr.type === 'Color' && (
              <div className="flex gap-2">
                {attr.allowedValues.map(value => (
                  <button
                    key={value}
                    onClick={() => handleAttributeChange(attr.name, value)}
                    className={`w-8 h-8 rounded border-2 ${
                      selectedAttributes[attr.name] === value
                        ? 'border-blue-600'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: value.toLowerCase() }}
                    title={value}
                  />
                ))}
              </div>
            )}

            {attr.type === 'Dropdown' && (
              <select
                value={selectedAttributes[attr.name] || ''}
                onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select {attr.name}</option>
                {attr.allowedValues.map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Variant Info */}
      {selectedVariant && (
        <div className="border rounded p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">SKU:</span>
            <span className="font-mono">{selectedVariant.sku}</span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Price:</span>
            <span className="text-2xl font-bold">
              R$ {(selectedVariant.priceOverride || selectedVariant.basePrice).toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Stock:</span>
            <span className={selectedVariant.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
              {selectedVariant.stockQuantity > 0 ? `${selectedVariant.stockQuantity} available` : 'Out of stock'}
            </span>
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <div className="flex gap-4">
        <input
          type="number"
          min="1"
          max={selectedVariant?.stockQuantity || 1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          className="w-20 border border-gray-300 rounded px-3 py-2"
        />
        <button
          onClick={() => {
            // Add variant to cart
          }}
          disabled={!selectedVariant || selectedVariant.stockQuantity === 0}
          className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

---

## 4. VARIANT CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: variant_attributes table
- [ ] Migration: product_variants table
- [ ] Migration: variant_images table
- [ ] Migration: sku_barcodes table
- [ ] Migration: variant_price_history table

### Backend
- [ ] ProductVariant entity
- [ ] VariantAttribute entity
- [ ] SKUBarcode entity
- [ ] VariantPriceHistory entity
- [ ] IVariantService interface
- [ ] VariantService implementation

### API Endpoints
- [ ] GET /variants/sku/{sku}
- [ ] GET /variants/product/{productId}
- [ ] POST /variants
- [ ] PUT /variants/{id}
- [ ] PATCH /variants/{id}/stock
- [ ] DELETE /variants/{id}
- [ ] GET /variants/low-stock

### Frontend
- [ ] Product detail page with variant selector
- [ ] Attribute dropdowns/color picker
- [ ] Image gallery per variant
- [ ] Price/stock dynamic display
- [ ] Add to cart with variant selection

### Features
- [ ] SKU uniqueness validation
- [ ] Barcode scanning integration
- [ ] Price override per variant
- [ ] Stock tracking per variant
- [ ] Variant images management
- [ ] Low stock alerts

### Testing
- [ ] Unit: SKU validation
- [ ] Unit: Price calculation
- [ ] Integration: Variant CRUD
- [ ] E2E: Product selection flow
```

---

**Product Variants & SKU Management Completo ✅**
