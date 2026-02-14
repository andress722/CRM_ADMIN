# SHIPPING & DELIVERY INTEGRATION - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Shipping providers, rate calculation, tracking, delivery management

---

## 1. SHIPPING PROVIDER ABSTRACTION

### 1.1 Domain Model

```csharp
// Domain/Entities/Shipment.cs
public class Shipment
{
  public Guid Id { get; set; }
  public Guid OrderId { get; set; }
  public ShippingProvider Provider { get; set; }    // Sedex, PAC, Loggi, etc
  public string TrackingNumber { get; set; }
  public ShippingStatus Status { get; set; }
  
  // Dimensions & Weight
  public decimal Weight { get; set; }               // kg
  public decimal Width { get; set; }
  public decimal Height { get; set; }
  public decimal Length { get; set; }
  
  // Cost
  public decimal ShippingCost { get; set; }
  public string ShippingService { get; set; }       // "Sedex 12", "PAC", etc
  public int EstimatedDays { get; set; }
  
  // Timeline
  public DateTime CreatedAt { get; set; }
  public DateTime? PickedUpAt { get; set; }
  public DateTime? InTransitAt { get; set; }
  public DateTime? DeliveredAt { get; set; }
  public DateTime EstimatedDeliveryDate { get; set; }
  
  // Address
  public string RecipientName { get; set; }
  public string RecipientPhone { get; set; }
  public ShippingAddress Address { get; set; }
  
  // Navigation
  public Order Order { get; set; }
  public List<ShipmentTracking> TrackingHistory { get; set; }
}

public enum ShippingProvider
{
  Sedex,
  PAC,
  Loggi,
  Rappi,
  Correios,
  Custom
}

public enum ShippingStatus
{
  Pending,          // Aguardando pickup
  PickedUp,         // Coletado
  InTransit,        // Em trânsito
  OutForDelivery,   // Saído para entrega
  Delivered,        // Entregue
  Failed,           // Falha na entrega
  Returned          // Devolvido
}

// Tracking updates
public class ShipmentTracking
{
  public Guid Id { get; set; }
  public Guid ShipmentId { get; set; }
  public string Status { get; set; }
  public string Location { get; set; }
  public string Message { get; set; }
  public DateTime UpdatedAt { get; set; }
  public Shipment Shipment { get; set; }
}

// Shipping address
public class ShippingAddress
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public string RecipientName { get; set; }
  public string Phone { get; set; }
  public string Street { get; set; }
  public string Number { get; set; }
  public string Complement { get; set; }
  public string Neighborhood { get; set; }
  public string City { get; set; }
  public string State { get; set; }
  public string PostalCode { get; set; }
  public bool IsDefault { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Shipping addresses
CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20),
  complement VARCHAR(255),
  neighborhood VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipping_addr_user_id ON shipping_addresses(user_id);

-- Shipments
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider VARCHAR(50) NOT NULL,                   -- 'Sedex', 'PAC', 'Loggi'
  tracking_number VARCHAR(255),
  status VARCHAR(50) NOT NULL,                     -- 'Pending', 'InTransit', etc
  weight DECIMAL(8,2),
  width DECIMAL(8,2),
  height DECIMAL(8,2),
  length DECIMAL(8,2),
  shipping_cost DECIMAL(10,2),
  shipping_service VARCHAR(100),
  estimated_days INT,
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  picked_up_at TIMESTAMP,
  in_transit_at TIMESTAMP,
  delivered_at TIMESTAMP,
  estimated_delivery_date DATE,
  address_id UUID REFERENCES shipping_addresses(id)
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);

-- Shipment tracking history
CREATE TABLE shipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(100),
  location VARCHAR(255),
  message TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_shipment_id ON shipment_tracking(shipment_id);
```

---

## 2. SHIPPING SERVICE IMPLEMENTATION

```csharp
// Application/Services/ShippingService.cs
public interface IShippingProvider
{
  Task<ShippingQuoteDto> GetQuoteAsync(ShippingQuoteRequest request);
  Task<ShipmentDto> CreateShipmentAsync(CreateShipmentRequest request);
  Task<string> CancelShipmentAsync(string trackingNumber);
  Task<ShipmentTrackingDto> TrackShipmentAsync(string trackingNumber);
  Task<bool> WebhookValidateAsync(string signature, string body);
}

public class ShippingService : IShippingService
{
  private readonly IShippingProviderFactory _providerFactory;
  private readonly IShipmentRepository _shipmentRepository;
  private readonly IOrderRepository _orderRepository;
  private readonly IEmailService _emailService;
  private readonly ILogger<ShippingService> _logger;

  public ShippingService(
    IShippingProviderFactory providerFactory,
    IShipmentRepository shipmentRepository,
    IOrderRepository orderRepository,
    IEmailService emailService,
    ILogger<ShippingService> logger)
  {
    _providerFactory = providerFactory;
    _shipmentRepository = shipmentRepository;
    _orderRepository = orderRepository;
    _emailService = emailService;
    _logger = logger;
  }

  // 1. GET SHIPPING QUOTES
  public async Task<IEnumerable<ShippingQuoteDto>> GetQuotesAsync(
    ShippingQuoteRequest request)
  {
    var quotes = new List<ShippingQuoteDto>();

    // Get quotes from multiple providers
    var providers = new[] 
    { 
      ShippingProvider.Sedex, 
      ShippingProvider.PAC,
      ShippingProvider.Loggi 
    };

    foreach (var provider in providers)
    {
      try
      {
        var shippingProvider = _providerFactory.Create(provider);
        var quote = await shippingProvider.GetQuoteAsync(request);
        quotes.Add(quote);
      }
      catch (Exception ex)
      {
        _logger.LogWarning(ex, "Failed to get quote from {provider}", provider);
      }
    }

    return quotes.OrderBy(x => x.Cost);
  }

  // 2. CREATE SHIPMENT
  public async Task<ShipmentDto> CreateShipmentAsync(
    Guid orderId,
    CreateShipmentRequest request)
  {
    var order = await _orderRepository.GetByIdAsync(orderId);
    if (order == null)
      throw new NotFoundException("Order not found");

    // Get provider
    var provider = _providerFactory.Create(request.Provider);

    // Calculate dimensions/weight from order items
    var shipmentRequest = new CreateShipmentRequest
    {
      PostalCode = request.PostalCode,
      Weight = request.Weight,
      Width = request.Width,
      Height = request.Height,
      Length = request.Length,
      Service = request.Service,
      RecipientName = request.RecipientName,
      RecipientPhone = request.RecipientPhone,
      Address = new ShippingAddressDto
      {
        Street = request.Address.Street,
        Number = request.Address.Number,
        City = request.Address.City,
        State = request.Address.State,
        PostalCode = request.Address.PostalCode
      }
    };

    // Create shipment with provider
    var providerResult = await provider.CreateShipmentAsync(shipmentRequest);

    // Save shipment record
    var shipment = new Shipment
    {
      OrderId = orderId,
      Provider = request.Provider,
      TrackingNumber = providerResult.TrackingNumber,
      Status = ShippingStatus.Pending,
      Weight = request.Weight,
      Width = request.Width,
      Height = request.Height,
      Length = request.Length,
      ShippingCost = providerResult.Cost,
      ShippingService = request.Service,
      EstimatedDays = providerResult.EstimatedDays,
      EstimatedDeliveryDate = DateTime.UtcNow.AddDays(providerResult.EstimatedDays),
      RecipientName = request.RecipientName,
      RecipientPhone = request.RecipientPhone,
      CreatedAt = DateTime.UtcNow
    };

    await _shipmentRepository.AddAsync(shipment);

    // Update order
    order.ShippingStatus = "Pending";
    order.TrackingNumber = shipment.TrackingNumber;
    await _orderRepository.UpdateAsync(order);

    // Send notification
    await _emailService.SendOrderShippedAsync(order, 
      $"https://tracking.loja.com.br/{shipment.TrackingNumber}");

    _logger.LogInformation(
      "Shipment created: order={orderId}, tracking={tracking}",
      orderId, shipment.TrackingNumber);

    return MapToDto(shipment);
  }

  // 3. TRACK SHIPMENT
  public async Task<ShipmentTrackingDto> TrackShipmentAsync(string trackingNumber)
  {
    var shipment = await _shipmentRepository.GetByTrackingAsync(trackingNumber);
    if (shipment == null)
      throw new NotFoundException("Shipment not found");

    var provider = _providerFactory.Create(shipment.Provider);

    // Get tracking from provider
    var tracking = await provider.TrackShipmentAsync(trackingNumber);

    // Update shipment status if changed
    if (tracking.Status != shipment.Status.ToString())
    {
      shipment.Status = Enum.Parse<ShippingStatus>(tracking.Status);

      if (tracking.Status == "InTransit")
        shipment.InTransitAt = DateTime.UtcNow;
      else if (tracking.Status == "Delivered")
        shipment.DeliveredAt = DateTime.UtcNow;

      await _shipmentRepository.UpdateAsync(shipment);

      // Record tracking history
      var trackingRecord = new ShipmentTracking
      {
        ShipmentId = shipment.Id,
        Status = tracking.Status,
        Location = tracking.Location,
        Message = tracking.Message,
        UpdatedAt = DateTime.UtcNow
      };

      await _shipmentRepository.AddTrackingAsync(trackingRecord);
    }

    return new ShipmentTrackingDto
    {
      TrackingNumber = trackingNumber,
      Status = shipment.Status.ToString(),
      Location = tracking.Location,
      Message = tracking.Message,
      EstimatedDelivery = shipment.EstimatedDeliveryDate,
      History = shipment.TrackingHistory.Select(x => new TrackingEventDto
      {
        Status = x.Status,
        Location = x.Location,
        Message = x.Message,
        UpdatedAt = x.UpdatedAt
      })
    };
  }

  // 4. HANDLE WEBHOOK (Delivery notification)
  public async Task HandleDeliveryWebhookAsync(
    ShippingProvider provider,
    string signature,
    string body)
  {
    var shippingProvider = _providerFactory.Create(provider);

    // Validate webhook
    if (!await shippingProvider.WebhookValidateAsync(signature, body))
      throw new UnauthorizedException("Invalid webhook signature");

    // Parse event
    var @event = JsonSerializer.Deserialize<ShippingWebhookEvent>(body);

    var shipment = await _shipmentRepository.GetByTrackingAsync(@event.TrackingNumber);
    if (shipment == null)
      return;

    // Update shipment
    shipment.Status = Enum.Parse<ShippingStatus>(@event.Status);
    if (@event.Status == "Delivered")
      shipment.DeliveredAt = DateTime.UtcNow;

    await _shipmentRepository.UpdateAsync(shipment);

    // Record tracking
    var tracking = new ShipmentTracking
    {
      ShipmentId = shipment.Id,
      Status = @event.Status,
      Location = @event.Location,
      Message = @event.Message,
      UpdatedAt = DateTime.UtcNow
    };

    await _shipmentRepository.AddTrackingAsync(tracking);

    // Notify customer if delivered
    if (@event.Status == "Delivered")
    {
      var order = await _orderRepository.GetByIdAsync(shipment.OrderId);
      await _emailService.SendAsync(
        order.UserEmail,
        subject: "Seu pedido foi entregue!",
        template: "DeliveryConfirmed",
        data: new { order, shipment }
      );
    }

    _logger.LogInformation(
      "Shipment webhook processed: tracking={tracking}, status={status}",
      @event.TrackingNumber, @event.Status);
  }

  private ShipmentDto MapToDto(Shipment shipment) => new ShipmentDto
  {
    Id = shipment.Id,
    TrackingNumber = shipment.TrackingNumber,
    Provider = shipment.Provider.ToString(),
    Status = shipment.Status.ToString(),
    EstimatedDelivery = shipment.EstimatedDeliveryDate,
    ShippingCost = shipment.ShippingCost
  };
}
```

### 2.2 Provider Implementation (Correios Brazil)

```csharp
// Infrastructure/Shipping/CorreiosShippingProvider.cs
public class CorreiosShippingProvider : IShippingProvider
{
  private readonly HttpClient _httpClient;
  private readonly ILogger<CorreiosShippingProvider> _logger;
  private const string ApiUrl = "https://api.correios.com.br";

  public CorreiosShippingProvider(HttpClient httpClient, ILogger<CorreiosShippingProvider> logger)
  {
    _httpClient = httpClient;
    _logger = logger;
  }

  public async Task<ShippingQuoteDto> GetQuoteAsync(ShippingQuoteRequest request)
  {
    try
    {
      var query = new Dictionary<string, string>
      {
        { "cepOrigem", "01234567" },  // Warehouse postal code
        { "cepDestino", request.PostalCode },
        { "peso", request.Weight.ToString("F2") },
        { "altura", request.Height.ToString("F2") },
        { "largura", request.Width.ToString("F2") },
        { "comprimento", request.Length.ToString("F2") }
      };

      var queryString = string.Join("&", query.Select(x => $"{x.Key}={x.Value}"));
      var response = await _httpClient.GetAsync($"{ApiUrl}/quote?{queryString}");

      var content = await response.Content.ReadAsStringAsync();
      var result = JsonSerializer.Deserialize<CorreiosQuoteResponse>(content);

      return new ShippingQuoteDto
      {
        Provider = "Correios",
        Service = result.Service,
        Cost = result.Cost,
        EstimatedDays = result.DeadlineBusiness,
        TrackingNumber = null  // Pre-shipment
      };
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error getting Correios quote");
      throw;
    }
  }

  public async Task<ShipmentDto> CreateShipmentAsync(CreateShipmentRequest request)
  {
    var payload = new
    {
      requestBody = new
      {
        cepDestino = request.PostalCode,
        peso = request.Weight,
        altura = request.Height,
        largura = request.Width,
        comprimento = request.Length,
        nomeDestinatario = request.RecipientName,
        telefonesDestinatario = request.RecipientPhone,
        enderecoDestinatario = new
        {
          logradouro = request.Address.Street,
          numero = request.Address.Number,
          cidade = request.Address.City,
          uf = request.Address.State,
          cep = request.Address.PostalCode
        }
      }
    };

    var response = await _httpClient.PostAsJsonAsync(
      $"{ApiUrl}/shipments",
      payload
    );

    var content = await response.Content.ReadAsStringAsync();
    var result = JsonSerializer.Deserialize<CorreiosShipmentResponse>(content);

    return new ShipmentDto
    {
      TrackingNumber = result.CodigoPostal,
      Cost = result.Valor,
      EstimatedDays = result.PrazoEntregaBusiness
    };
  }

  public async Task<ShipmentTrackingDto> TrackShipmentAsync(string trackingNumber)
  {
    var response = await _httpClient.GetAsync(
      $"{ApiUrl}/track/{trackingNumber}"
    );

    var content = await response.Content.ReadAsStringAsync();
    var result = JsonSerializer.Deserialize<CorreiosTrackingResponse>(content);

    return new ShipmentTrackingDto
    {
      TrackingNumber = trackingNumber,
      Status = result.Status,
      Location = result.Location,
      Message = result.Message
    };
  }

  public async Task<bool> WebhookValidateAsync(string signature, string body)
  {
    // Correios uses HMAC-SHA256
    var secret = Environment.GetEnvironmentVariable("CORREIOS_WEBHOOK_SECRET");
    var hash = HMACSHA256(body, secret);
    return hash == signature;
  }

  public async Task<string> CancelShipmentAsync(string trackingNumber)
  {
    var response = await _httpClient.DeleteAsync(
      $"{ApiUrl}/shipments/{trackingNumber}"
    );

    return await response.Content.ReadAsStringAsync();
  }

  private string HMACSHA256(string data, string key)
  {
    var keyBytes = Encoding.UTF8.GetBytes(key);
    using (var hmac = new HMACSHA256(keyBytes))
    {
      var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
      return Convert.ToBase64String(hash);
    }
  }
}
```

---

## 3. API ENDPOINTS

```csharp
[ApiController]
[Route("api/v1/shipping")]
[Authorize]
public class ShippingController : ControllerBase
{
  private readonly IShippingService _shippingService;

  // GET /api/v1/shipping/quotes
  [HttpGet("quotes")]
  public async Task<IActionResult> GetQuotes([FromQuery] ShippingQuoteRequest request)
  {
    var quotes = await _shippingService.GetQuotesAsync(request);
    return Ok(quotes);
  }

  // POST /api/v1/shipping/shipments
  [HttpPost("shipments")]
  [Authorize(Roles = "Customer,AdminGeneral")]
  public async Task<IActionResult> CreateShipment(
    [FromQuery] Guid orderId,
    [FromBody] CreateShipmentRequest request)
  {
    var result = await _shippingService.CreateShipmentAsync(orderId, request);
    return Created($"/api/v1/shipping/track/{result.TrackingNumber}", result);
  }

  // GET /api/v1/shipping/track/{trackingNumber}
  [HttpGet("track/{trackingNumber}")]
  [AllowAnonymous]
  public async Task<IActionResult> Track(string trackingNumber)
  {
    var result = await _shippingService.TrackShipmentAsync(trackingNumber);
    return Ok(result);
  }

  // POST /api/v1/webhooks/shipping (Webhook)
  [HttpPost("/api/webhooks/shipping")]
  [AllowAnonymous]
  public async Task<IActionResult> HandleWebhook(
    [FromHeader(Name = "X-Provider")] string provider,
    [FromHeader(Name = "X-Signature")] string signature)
  {
    var body = await new StreamReader(Request.Body).ReadToEndAsync();
    await _shippingService.HandleDeliveryWebhookAsync(
      Enum.Parse<ShippingProvider>(provider),
      signature,
      body
    );

    return Ok();
  }
}
```

---

## 4. SHIPPING CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: shipping_addresses table
- [ ] Migration: shipments table
- [ ] Migration: shipment_tracking table

### Backend
- [ ] Shipment entity
- [ ] ShippingAddress entity
- [ ] IShippingProvider interface
- [ ] CorreiosShippingProvider implementation
- [ ] LoggiShippingProvider implementation
- [ ] IShippingService interface
- [ ] ShippingService implementation
- [ ] Webhook handler

### API Endpoints
- [ ] GET /shipping/quotes
- [ ] POST /shipping/shipments
- [ ] GET /shipping/track/{trackingNumber}
- [ ] POST /webhooks/shipping

### Features
- [ ] Multi-provider support
- [ ] Rate calculation
- [ ] Shipment creation
- [ ] Real-time tracking
- [ ] Webhook handling
- [ ] Delivery notifications

### Testing
- [ ] Unit: Quote calculation
- [ ] Integration: Provider API mocking
- [ ] E2E: Complete shipping flow
```

---

**Shipping & Delivery Integration Completo ✅**
