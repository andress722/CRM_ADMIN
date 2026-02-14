# WEBHOOK & RETRY SYSTEM - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Webhook delivery, retry logic, idempotency, event handling

---

## 1. WEBHOOK INFRASTRUCTURE

### 1.1 Domain Model

```csharp
// Domain/Entities/Webhook.cs
public class Webhook
{
  public Guid Id { get; set; }
  public string Url { get; set; }
  public WebhookEventType[] EventTypes { get; set; }
  public WebhookStatus Status { get; set; }
  public string Secret { get; set; }  // For HMAC signing
  public int MaxRetries { get; set; } = 5;
  public int TimeoutSeconds { get; set; } = 30;
  public bool IsActive { get; set; }
  public DateTime CreatedAt { get; set; }
  public List<WebhookDelivery> Deliveries { get; set; }
}

public enum WebhookEventType
{
  OrderCreated,
  OrderCancelled,
  PaymentSucceeded,
  PaymentFailed,
  RefundRequested,
  RefundCompleted,
  ShipmentCreated,
  ShipmentDelivered,
  ChargebackReceived,
  CustomerCreated,
  ProductCreated,
  InventoryLow
}

public enum WebhookStatus
{
  Active,
  Suspended,      // Too many failures
  Deleted
}

// Webhook delivery attempt
public class WebhookDelivery
{
  public Guid Id { get; set; }
  public Guid WebhookId { get; set; }
  public string EventId { get; set; }
  public WebhookEventType EventType { get; set; }
  public string Payload { get; set; }  // JSON
  public int Attempt { get; set; }
  public int HttpStatusCode { get; set; }
  public string ResponseBody { get; set; }
  public DateTime DeliveryTime { get; set; }
  public DateTime? NextRetryAt { get; set; }
  public WebhookDeliveryStatus Status { get; set; }
  
  public Webhook Webhook { get; set; }
}

public enum WebhookDeliveryStatus
{
  Pending,
  Success,
  Failed,        // Max retries exceeded
  Timeout,
  Idempotent     // Already delivered
}

// Event log for traceability
public class WebhookEventLog
{
  public Guid Id { get; set; }
  public string EventId { get; set; }
  public WebhookEventType EventType { get; set; }
  public string Payload { get; set; }
  public Guid AggregateId { get; set; }        // Order ID, Payment ID, etc
  public DateTime CreatedAt { get; set; }
  public int TotalDeliveryAttempts { get; set; }
  public int SuccessfulDeliveries { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(2048) NOT NULL,
  event_types TEXT[] NOT NULL,                  -- Array of event types
  status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Suspended, Deleted
  secret VARCHAR(255) NOT NULL,                 -- For HMAC-SHA256
  max_retries INT DEFAULT 5,
  timeout_seconds INT DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload TEXT NOT NULL,
  attempt INT DEFAULT 1,
  http_status_code INT,
  response_body TEXT,
  status VARCHAR(50) NOT NULL,                 -- Pending, Success, Failed, etc
  delivery_time TIMESTAMP,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(webhook_id, event_id)  -- Idempotency
);

CREATE INDEX idx_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_deliveries_event_id ON webhook_deliveries(event_id);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_deliveries_next_retry ON webhook_deliveries(next_retry_at) 
  WHERE status = 'Pending';

-- Webhook event log
CREATE TABLE webhook_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  payload TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  total_delivery_attempts INT DEFAULT 0,
  successful_deliveries INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_logs_aggregate_id ON webhook_event_logs(aggregate_id);
CREATE INDEX idx_event_logs_created_at ON webhook_event_logs(created_at DESC);
```

---

## 2. WEBHOOK SERVICE IMPLEMENTATION

```csharp
// Application/Services/WebhookService.cs
public interface IWebhookService
{
  Task PublishEventAsync(WebhookEventType eventType, string aggregateId, object payload);
  Task<WebhookDeliveryDto> GetDeliveryAsync(Guid deliveryId);
  Task RetryDeliveryAsync(Guid deliveryId);
  Task<IEnumerable<WebhookDeliveryDto>> GetFailedDeliveriesAsync();
  Task ProcessRetryQueueAsync();  // Scheduled job
  Task RegisterWebhookAsync(string url, WebhookEventType[] eventTypes);
  Task UnregisterWebhookAsync(Guid webhookId);
}

public class WebhookService : IWebhookService
{
  private readonly IWebhookRepository _webhookRepository;
  private readonly IWebhookDeliveryRepository _deliveryRepository;
  private readonly IWebhookEventLogRepository _eventLogRepository;
  private readonly IBackgroundJobClient _jobClient;
  private readonly ILogger<WebhookService> _logger;
  private readonly HttpClient _httpClient;

  private const int INITIAL_RETRY_DELAY_SECONDS = 60;
  private const int MAX_RETRY_DELAY_SECONDS = 3600;  // 1 hour

  public WebhookService(
    IWebhookRepository webhookRepository,
    IWebhookDeliveryRepository deliveryRepository,
    IWebhookEventLogRepository eventLogRepository,
    IBackgroundJobClient jobClient,
    HttpClient httpClient,
    ILogger<WebhookService> logger)
  {
    _webhookRepository = webhookRepository;
    _deliveryRepository = deliveryRepository;
    _eventLogRepository = eventLogRepository;
    _jobClient = jobClient;
    _httpClient = httpClient;
    _logger = logger;
  }

  // 1. PUBLISH EVENT (Fire and forget)
  public async Task PublishEventAsync(
    WebhookEventType eventType,
    string aggregateId,
    object payload)
  {
    var eventId = $"{eventType}-{aggregateId}-{DateTime.UtcNow:yyyyMMddHHmmss}";

    // Create event log
    var eventLog = new WebhookEventLog
    {
      EventId = eventId,
      EventType = eventType,
      Payload = JsonSerializer.Serialize(payload),
      AggregateId = Guid.Parse(aggregateId),
      CreatedAt = DateTime.UtcNow
    };

    await _eventLogRepository.AddAsync(eventLog);

    // Get all webhooks interested in this event
    var webhooks = await _webhookRepository.GetByEventTypeAsync(eventType);

    foreach (var webhook in webhooks)
    {
      if (!webhook.IsActive || webhook.Status != WebhookStatus.Active)
        continue;

      // Create delivery record (Pending)
      var delivery = new WebhookDelivery
      {
        WebhookId = webhook.Id,
        EventId = eventId,
        EventType = eventType,
        Payload = eventLog.Payload,
        Attempt = 1,
        Status = WebhookDeliveryStatus.Pending,
        DeliveryTime = DateTime.UtcNow
      };

      await _deliveryRepository.AddAsync(delivery);

      // Queue for immediate delivery
      _jobClient.Enqueue<IWebhookDeliveryWorker>(
        x => x.DeliverAsync(delivery.Id)
      );
    }

    _logger.LogInformation(
      "Webhook event published: {eventType}, {eventId}, {webhookCount} webhooks",
      eventType, eventId, webhooks.Count);
  }

  // 2. DELIVER WEBHOOK (Hangfire job)
  public async Task DeliverWebhookAsync(Guid deliveryId)
  {
    var delivery = await _deliveryRepository.GetByIdAsync(deliveryId);
    if (delivery == null)
      throw new NotFoundException("Delivery not found");

    var webhook = await _webhookRepository.GetByIdAsync(delivery.WebhookId);
    if (webhook == null || !webhook.IsActive)
    {
      delivery.Status = WebhookDeliveryStatus.Failed;
      await _deliveryRepository.UpdateAsync(delivery);
      return;
    }

    try
    {
      // Create signed request
      var signature = GenerateSignature(delivery.Payload, webhook.Secret);
      
      using (var request = new HttpRequestMessage(HttpMethod.Post, webhook.Url))
      {
        request.Headers.Add("X-Webhook-Event", delivery.EventType.ToString());
        request.Headers.Add("X-Webhook-ID", delivery.WebhookId.ToString());
        request.Headers.Add("X-Webhook-Delivery-ID", delivery.Id.ToString());
        request.Headers.Add("X-Webhook-Signature", signature);
        request.Content = new StringContent(
          delivery.Payload,
          Encoding.UTF8,
          "application/json"
        );

        var cts = new CancellationTokenSource(
          TimeSpan.FromSeconds(webhook.TimeoutSeconds)
        );

        var response = await _httpClient.SendAsync(request, cts.Token);
        var responseBody = await response.Content.ReadAsStringAsync();

        delivery.HttpStatusCode = (int)response.StatusCode;
        delivery.ResponseBody = responseBody;

        if (response.IsSuccessStatusCode)
        {
          delivery.Status = WebhookDeliveryStatus.Success;
          delivery.DeliveryTime = DateTime.UtcNow;

          _logger.LogInformation(
            "Webhook delivered successfully: {deliveryId}, status={statusCode}",
            deliveryId, response.StatusCode);
        }
        else
        {
          throw new Exception($"Webhook returned {response.StatusCode}");
        }
      }
    }
    catch (OperationCanceledException)
    {
      _logger.LogWarning("Webhook delivery timeout: {deliveryId}", deliveryId);
      delivery.Status = WebhookDeliveryStatus.Timeout;
      delivery.HttpStatusCode = 408;  // Request Timeout
    }
    catch (Exception ex)
    {
      _logger.LogWarning(ex, "Webhook delivery failed: {deliveryId}, attempt={attempt}",
        deliveryId, delivery.Attempt);

      delivery.Attempt++;

      // Schedule retry
      if (delivery.Attempt <= webhook.MaxRetries)
      {
        var delaySeconds = Math.Min(
          INITIAL_RETRY_DELAY_SECONDS * (int)Math.Pow(2, delivery.Attempt - 1),
          MAX_RETRY_DELAY_SECONDS
        );

        delivery.Status = WebhookDeliveryStatus.Pending;
        delivery.NextRetryAt = DateTime.UtcNow.AddSeconds(delaySeconds);

        _logger.LogInformation(
          "Webhook retry scheduled: {deliveryId}, nextRetry={nextRetry}",
          deliveryId, delivery.NextRetryAt);
      }
      else
      {
        delivery.Status = WebhookDeliveryStatus.Failed;

        // Suspend webhook after multiple failures
        var recentFailures = await _deliveryRepository.GetRecentFailureCountAsync(
          delivery.WebhookId
        );

        if (recentFailures > 10)
        {
          webhook.Status = WebhookStatus.Suspended;
          await _webhookRepository.UpdateAsync(webhook);

          _logger.LogWarning(
            "Webhook suspended due to repeated failures: {webhookId}",
            delivery.WebhookId);
        }
      }
    }
    finally
    {
      await _deliveryRepository.UpdateAsync(delivery);
    }
  }

  // 3. PROCESS RETRY QUEUE (Scheduled job - every 5 minutes)
  public async Task ProcessRetryQueueAsync()
  {
    var pendingDeliveries = await _deliveryRepository.GetPendingRetriesAsync(
      DateTime.UtcNow
    );

    _logger.LogInformation("Processing {count} pending webhook retries", 
      pendingDeliveries.Count);

    foreach (var delivery in pendingDeliveries)
    {
      _jobClient.Enqueue<IWebhookDeliveryWorker>(
        x => x.DeliverAsync(delivery.Id)
      );
    }
  }

  // 4. RETRY DELIVERY MANUALLY
  public async Task RetryDeliveryAsync(Guid deliveryId)
  {
    var delivery = await _deliveryRepository.GetByIdAsync(deliveryId);
    if (delivery == null)
      throw new NotFoundException("Delivery not found");

    delivery.Status = WebhookDeliveryStatus.Pending;
    delivery.Attempt = 1;
    delivery.NextRetryAt = DateTime.UtcNow;

    await _deliveryRepository.UpdateAsync(delivery);

    // Immediate delivery
    _jobClient.Enqueue<IWebhookDeliveryWorker>(
      x => x.DeliverAsync(delivery.Id)
    );
  }

  // 5. GET FAILED DELIVERIES
  public async Task<IEnumerable<WebhookDeliveryDto>> GetFailedDeliveriesAsync()
  {
    var deliveries = await _deliveryRepository.GetAsync(
      predicate: x => x.Status == WebhookDeliveryStatus.Failed,
      orderBy: q => q.OrderByDescending(x => x.CreatedAt),
      pageSize: 100
    );

    return deliveries.Select(x => new WebhookDeliveryDto
    {
      Id = x.Id,
      WebhookId = x.WebhookId,
      EventId = x.EventId,
      EventType = x.EventType.ToString(),
      Status = x.Status.ToString(),
      Attempt = x.Attempt,
      HttpStatusCode = x.HttpStatusCode,
      ResponseBody = x.ResponseBody,
      CreatedAt = x.CreatedAt
    });
  }

  // Helper: Generate HMAC-SHA256 signature
  private string GenerateSignature(string payload, string secret)
  {
    var keyBytes = Encoding.UTF8.GetBytes(secret);
    using (var hmac = new HMACSHA256(keyBytes))
    {
      var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
      return $"sha256={Convert.ToHexString(hash).ToLower()}";
    }
  }

  public async Task RegisterWebhookAsync(string url, WebhookEventType[] eventTypes)
  {
    var webhook = new Webhook
    {
      Url = url,
      EventTypes = eventTypes,
      Secret = GenerateSecret(),
      Status = WebhookStatus.Active,
      IsActive = true,
      CreatedAt = DateTime.UtcNow
    };

    await _webhookRepository.AddAsync(webhook);
  }

  private string GenerateSecret()
  {
    var bytes = new byte[32];
    using (var rng = new RNGCryptoServiceProvider())
    {
      rng.GetBytes(bytes);
    }
    return Convert.ToBase64String(bytes);
  }

  public async Task UnregisterWebhookAsync(Guid webhookId)
  {
    var webhook = await _webhookRepository.GetByIdAsync(webhookId);
    if (webhook != null)
    {
      webhook.Status = WebhookStatus.Deleted;
      webhook.IsActive = false;
      await _webhookRepository.UpdateAsync(webhook);
    }
  }

  public async Task<WebhookDeliveryDto> GetDeliveryAsync(Guid deliveryId)
  {
    var delivery = await _deliveryRepository.GetByIdAsync(deliveryId);
    if (delivery == null)
      throw new NotFoundException("Delivery not found");

    return new WebhookDeliveryDto
    {
      Id = delivery.Id,
      WebhookId = delivery.WebhookId,
      EventId = delivery.EventId,
      EventType = delivery.EventType.ToString(),
      Status = delivery.Status.ToString(),
      Attempt = delivery.Attempt,
      Payload = delivery.Payload,
      HttpStatusCode = delivery.HttpStatusCode,
      ResponseBody = delivery.ResponseBody,
      CreatedAt = delivery.CreatedAt
    };
  }
}

// Worker interface
public interface IWebhookDeliveryWorker
{
  Task DeliverAsync(Guid deliveryId);
}

public class WebhookDeliveryWorker : IWebhookDeliveryWorker
{
  private readonly IWebhookService _webhookService;

  public WebhookDeliveryWorker(IWebhookService webhookService)
  {
    _webhookService = webhookService;
  }

  public async Task DeliverAsync(Guid deliveryId)
  {
    await _webhookService.DeliverWebhookAsync(deliveryId);
  }
}
```

---

## 3. WEBHOOK VALIDATION (Receiver side)

```csharp
// Sample code for webhook consumers
public class WebhookValidator
{
  public static bool ValidateSignature(string payload, string signature, string secret)
  {
    var keyBytes = Encoding.UTF8.GetBytes(secret);
    using (var hmac = new HMACSHA256(keyBytes))
    {
      var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
      var computedSignature = $"sha256={Convert.ToHexString(hash).ToLower()}";
      return computedSignature == signature;
    }
  }
}

// Example webhook handler
[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]
public class WebhookController : ControllerBase
{
  [HttpPost("loja")]
  public async Task<IActionResult> HandleWebhook(
    [FromBody] dynamic payload,
    [FromHeader(Name = "X-Webhook-Signature")] string signature,
    [FromHeader(Name = "X-Webhook-Event")] string eventType)
  {
    var body = await new StreamReader(Request.Body).ReadToEndAsync();
    var webhookSecret = Environment.GetEnvironmentVariable("WEBHOOK_SECRET");

    // Validate signature
    if (!WebhookValidator.ValidateSignature(body, signature, webhookSecret))
      return Unauthorized();

    // Process event
    switch (eventType)
    {
      case "OrderCreated":
        // Handle order creation
        break;
      case "PaymentSucceeded":
        // Handle payment success
        break;
      case "ShipmentDelivered":
        // Handle delivery
        break;
    }

    return Ok();
  }
}
```

---

## 4. WEBHOOK CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: webhooks table
- [ ] Migration: webhook_deliveries table
- [ ] Migration: webhook_event_logs table

### Backend
- [ ] Webhook entity
- [ ] WebhookDelivery entity
- [ ] WebhookEventLog entity
- [ ] IWebhookService interface
- [ ] WebhookService implementation
- [ ] WebhookDeliveryWorker (Hangfire)

### Features
- [ ] Event publishing
- [ ] HMAC-SHA256 signing
- [ ] Exponential backoff retry
- [ ] Idempotency (unique event delivery)
- [ ] Webhook suspension on failures
- [ ] Manual retry functionality
- [ ] Delivery history tracking

### Scheduled Jobs
- [ ] Process retry queue (every 5 minutes)
- [ ] Cleanup old deliveries (daily)

### Monitoring
- [ ] Failed delivery alerts
- [ ] Webhook suspension notifications
- [ ] Delivery latency metrics
```

---

**Webhook & Retry System Completo ✅**
