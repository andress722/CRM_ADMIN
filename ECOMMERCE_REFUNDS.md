# REFUNDS & CHARGEBACK MANAGEMENT - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Refund workflow, chargeback handling, reversal de estoque, compliance

---

## 1. REFUND ENTITY & DATABASE SCHEMA

### 1.1 Refund Entity

```csharp
// Domain/Entities/Refund.cs
public class Refund
{
  public Guid Id { get; set; }
  public Guid PaymentId { get; set; }
  public Guid OrderId { get; set; }
  public decimal Amount { get; set; }
  public RefundType Type { get; set; }              // Full, Partial
  public RefundStatus Status { get; set; }          // Pending, Approved, Completed, Failed, Disputed
  
  // Reason
  public string Reason { get; set; }                // "customer_request", "item_not_received", etc
  public string CustomerNotes { get; set; }
  public string AdminNotes { get; set; }
  
  // Timeline
  public DateTime RequestedAt { get; set; }
  public DateTime? ApprovedAt { get; set; }
  public DateTime? ProcessedAt { get; set; }
  public DateTime? DisputedAt { get; set; }
  
  // Provider info
  public string ExternalRefundId { get; set; }      // Stripe refund ID, etc
  public string ProviderStatus { get; set; }        // succeeded, failed, etc
  
  // Chargeback
  public bool IsDisputed { get; set; }
  public string DisputeReason { get; set; }
  public DateTime? DisputeDeadlineAt { get; set; }
  
  // Audit
  public Guid RequestedByUserId { get; set; }
  public Guid? ApprovedByAdminId { get; set; }
  public string ApprovedByAdminName { get; set; }
  
  // Navigation
  public Payment Payment { get; set; }
  public Order Order { get; set; }
  public User RequestedByUser { get; set; }
}

public enum RefundType
{
  Full,      // Reembolso total
  Partial    // Reembolso parcial
}

public enum RefundStatus
{
  Pending,           // Aguardando aprovação
  Approved,          // Aprovado, aguardando processamento
  Processing,        // Processando com provider
  Completed,         // Completado com sucesso
  Failed,            // Falha no processamento
  Disputed,          // Contestado (chargeback)
  Reversed           // Revertido (chargie ganhou)
}
```

### 1.2 PostgreSQL DDL

```sql
-- Refund table
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,              -- 'Full' ou 'Partial'
  status VARCHAR(50) NOT NULL,            -- 'Pending', 'Approved', etc
  reason VARCHAR(100),
  customer_notes TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  disputed_at TIMESTAMP,
  external_refund_id VARCHAR(255),        -- Stripe, etc
  provider_status VARCHAR(50),
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_reason VARCHAR(255),
  dispute_deadline_at TIMESTAMP,
  requested_by_user_id UUID NOT NULL REFERENCES users(id),
  approved_by_admin_id UUID REFERENCES users(id),
  approved_by_admin_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT refund_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_requested_by ON refunds(requested_by_user_id);
CREATE INDEX idx_refunds_disputed ON refunds(is_disputed);

-- Refund items (quais itens do order foram reembolsados)
CREATE TABLE refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  refund_reason VARCHAR(100),
  
  CONSTRAINT refund_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_refund_items_refund_id ON refund_items(refund_id);
CREATE INDEX idx_refund_items_order_item_id ON refund_items(order_item_id);

-- Chargeback tracking
CREATE TABLE chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  external_chargeback_id VARCHAR(255),
  reason_code VARCHAR(50),                -- Chargeback reason (fraud, not_received, etc)
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,            -- 'Opened', 'Won', 'Lost', 'Submitted'
  customer_message TEXT,
  dispute_deadline_at TIMESTAMP NOT NULL,
  last_status_update TIMESTAMP,
  provider_response TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chargebacks_refund_id ON chargebacks(refund_id);
CREATE INDEX idx_chargebacks_status ON chargebacks(status);
```

---

## 2. REFUND WORKFLOW

### 2.1 State Machine

```
PENDING → APPROVED → PROCESSING → COMPLETED
   ↓                                    ↓
 FAILED ← DENIED                    DISPUTED → Chargeback
```

### 2.2 Refund Service Implementation

```csharp
// Application/Services/RefundService.cs
public class RefundService
{
  private readonly IRefundRepository _refundRepository;
  private readonly IPaymentProvider _paymentProvider;
  private readonly IOrderRepository _orderRepository;
  private readonly IInventoryService _inventoryService;
  private readonly IEmailService _emailService;
  private readonly IAuditService _auditService;
  private readonly ILogger<RefundService> _logger;

  // 1. REQUEST REFUND (Customer)
  public async Task<RefundDto> RequestRefundAsync(
    Guid orderId,
    Guid userId,
    RefundRequestDto request)
  {
    var order = await _orderRepository.GetByIdAsync(orderId);
    if (order == null || order.UserId != userId)
      throw new UnauthorizedException("Order not found");

    // Validações
    if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Shipped)
      throw new DomainException("Order cannot be refunded in current status");

    // Verificar se já existe refund em progresso
    var existingRefund = await _refundRepository.GetPendingByOrderAsync(orderId);
    if (existingRefund != null)
      throw new DomainException("Refund already in progress for this order");

    // Timeline de refund (30 dias após pedido)
    var refundDeadline = order.CreatedAt.AddDays(30);
    if (DateTime.UtcNow > refundDeadline)
      throw new DomainException("Refund window expired (30 days)");

    // Criar refund
    var refund = new Refund
    {
      PaymentId = order.PaymentId,
      OrderId = orderId,
      Amount = order.Total,
      Type = RefundType.Full,
      Status = RefundStatus.Pending,
      Reason = request.Reason,
      CustomerNotes = request.Notes,
      RequestedAt = DateTime.UtcNow,
      RequestedByUserId = userId
    };

    await _refundRepository.AddAsync(refund);

    // Log de auditoria
    await _auditService.LogAsync(
      "RefundRequested",
      "Refund",
      refund.Id.ToString(),
      new { orderId, amount = order.Total, reason = request.Reason },
      userId.ToString()
    );

    // Notificar admin
    await _emailService.SendAsync(
      adminEmail: "admin@loja.com.br",
      subject: $"Nova solicitação de reembolso - Pedido {order.Id}",
      template: "RefundRequestNotification",
      data: new { refund, order }
    );

    return MapToDto(refund);
  }

  // 2. APPROVE REFUND (Admin)
  public async Task<RefundDto> ApproveRefundAsync(
    Guid refundId,
    Guid adminId,
    ApproveRefundRequest request)
  {
    var refund = await _refundRepository.GetByIdAsync(refundId);
    if (refund == null)
      throw new NotFoundException("Refund not found");

    if (refund.Status != RefundStatus.Pending)
      throw new DomainException($"Cannot approve refund in {refund.Status} status");

    // Validações de negócio
    var payment = await _paymentRepository.GetByIdAsync(refund.PaymentId);
    if (payment.Status != PaymentStatus.Succeeded)
      throw new DomainException("Payment not in success state");

    // Atualizar refund
    refund.Status = RefundStatus.Approved;
    refund.ApprovedAt = DateTime.UtcNow;
    refund.ApprovedByAdminId = adminId;
    refund.AdminNotes = request.AdminNotes;
    refund.ApprovedByAdminName = request.AdminName;

    await _refundRepository.UpdateAsync(refund);

    // Log
    await _auditService.LogAsync(
      "RefundApproved",
      "Refund",
      refund.Id.ToString(),
      new { reason = request.AdminNotes },
      adminId.ToString()
    );

    // Notificar customer
    var order = await _orderRepository.GetByIdAsync(refund.OrderId);
    await _emailService.SendAsync(
      order.UserEmail,
      subject: "Seu reembolso foi aprovado",
      template: "RefundApproved",
      data: new { refund, order }
    );

    return MapToDto(refund);
  }

  // 3. PROCESS REFUND (Backend - via payment provider)
  public async Task ProcessRefundAsync(Guid refundId)
  {
    var refund = await _refundRepository.GetByIdAsync(refundId);
    if (refund.Status != RefundStatus.Approved)
      throw new DomainException("Refund not approved yet");

    try
    {
      refund.Status = RefundStatus.Processing;
      await _refundRepository.UpdateAsync(refund);

      // Chamar provider de pagamento
      var payment = await _paymentRepository.GetByIdAsync(refund.PaymentId);
      
      RefundResult result;
      if (payment.Provider == "stripe")
      {
        result = await _stripeService.CreateRefundAsync(
          chargeId: payment.ExternalPaymentId,
          amount: (long)(refund.Amount * 100),  // Stripe usa centavos
          reason: refund.Reason
        );
      }
      else if (payment.Provider == "mercado_pago")
      {
        result = await _mercadoPagoService.CreateRefundAsync(
          paymentId: payment.ExternalPaymentId,
          amount: refund.Amount
        );
      }
      else
      {
        throw new UnsupportedProviderException(payment.Provider);
      }

      // Atualizar refund com resultado
      refund.ExternalRefundId = result.RefundId;
      refund.ProviderStatus = result.Status;
      refund.Status = result.Success ? RefundStatus.Completed : RefundStatus.Failed;
      refund.ProcessedAt = DateTime.UtcNow;

      await _refundRepository.UpdateAsync(refund);

      // Se completado, reverter estoque
      if (refund.Status == RefundStatus.Completed)
      {
        await ReverseInventoryAsync(refund);
      }

      // Notificar customer
      var order = await _orderRepository.GetByIdAsync(refund.OrderId);
      var templateName = refund.Status == RefundStatus.Completed 
        ? "RefundCompleted" 
        : "RefundFailed";
      
      await _emailService.SendAsync(
        order.UserEmail,
        subject: $"Seu reembolso - {(refund.Status == RefundStatus.Completed ? "Processado" : "Falhou")}",
        template: templateName,
        data: new { refund, order }
      );

      // Log
      await _auditService.LogAsync(
        "RefundProcessed",
        "Refund",
        refund.Id.ToString(),
        new { status = refund.Status, externalRefundId = refund.ExternalRefundId },
        systemId: "scheduler"
      );
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error processing refund {refundId}", refundId);
      refund.Status = RefundStatus.Failed;
      await _refundRepository.UpdateAsync(refund);

      throw;
    }
  }

  // 4. REVERSE INVENTORY
  private async Task ReverseInventoryAsync(Refund refund)
  {
    var order = await _orderRepository.GetByIdAsync(refund.OrderId);
    
    foreach (var item in order.Items)
    {
      // Restaurar quantidade ao estoque
      await _inventoryService.AddStockAsync(
        productId: item.ProductId,
        quantity: item.Quantity,
        reason: $"Refund {refund.Id}",
        referenceId: refund.Id.ToString()
      );
    }

    _logger.LogInformation("Inventory reversed for refund {refundId}", refund.Id);
  }

  // 5. HANDLE CHARGEBACK (Webhook from provider)
  public async Task HandleChargebackAsync(ChargebackWebhookDto webhook)
  {
    var payment = await _paymentRepository.GetByExternalIdAsync(webhook.ChargeId);
    if (payment == null)
      throw new NotFoundException("Payment not found");

    var refund = await _refundRepository.GetByPaymentAsync(payment.Id);
    if (refund == null)
    {
      // Chargeback sem refund anterior (fraude)
      refund = new Refund
      {
        PaymentId = payment.Id,
        OrderId = payment.OrderId,
        Amount = webhook.Amount,
        Status = RefundStatus.Disputed,
        Reason = "chargeback",
        RequestedAt = DateTime.UtcNow,
        RequestedByUserId = payment.UserId,
        IsDisputed = true
      };

      await _refundRepository.AddAsync(refund);
    }

    // Criar/atualizar chargeback record
    var chargeback = new Chargeback
    {
      RefundId = refund.Id,
      ExternalChargebackId = webhook.DisputeId,
      ReasonCode = webhook.ReasonCode,
      Amount = webhook.Amount,
      Status = webhook.Status,
      CustomerMessage = webhook.CustomerMessage,
      DisputeDeadlineAt = webhook.DisputeDeadlineAt,
      LastStatusUpdate = DateTime.UtcNow
    };

    await _chargebackRepository.AddAsync(chargeback);

    // Atualizar status refund
    refund.IsDisputed = true;
    refund.Status = RefundStatus.Disputed;
    refund.DisputedAt = DateTime.UtcNow;
    refund.DisputeDeadline = webhook.DisputeDeadlineAt;

    await _refundRepository.UpdateAsync(refund);

    // Notificar admin URGENTE
    await _emailService.SendAsync(
      adminEmail: "admin@loja.com.br",
      subject: "🚨 CHARGEBACK RECEBIDO - Ação Imediata Necessária",
      template: "ChargebackAlert",
      data: new { refund, chargeback, payment },
      priority: EmailPriority.High
    );

    // Log crítico
    await _auditService.LogAsync(
      "ChargebackReceived",
      "Chargeback",
      chargeback.Id.ToString(),
      new { amount = chargeback.Amount, reason = chargeback.ReasonCode },
      systemId: "webhook"
    );
  }

  // 6. DISPUTE CHARGEBACK (Admin response)
  public async Task DisputeChargebackAsync(
    Guid chargebackId,
    DisputeChargebackRequest request)
  {
    var chargeback = await _chargebackRepository.GetByIdAsync(chargebackId);
    if (chargeback == null)
      throw new NotFoundException("Chargeback not found");

    // Verificar deadline
    if (DateTime.UtcNow > chargeback.DisputeDeadlineAt)
      throw new DomainException("Dispute deadline has passed");

    try
    {
      // Chamar provider para contestar
      var dispatchResult = await _paymentProvider.SubmitChargebackDisputeAsync(
        chargebackId: chargeback.ExternalChargebackId,
        evidence: request.Evidence,
        tracking: request.TrackingInfo
      );

      chargeback.Status = "Submitted";
      chargeback.ProviderResponse = JsonSerializer.Serialize(dispatchResult);
      chargeback.LastStatusUpdate = DateTime.UtcNow;

      await _chargebackRepository.UpdateAsync(chargeback);

      // Log
      await _auditService.LogAsync(
        "ChargebackDisputed",
        "Chargeback",
        chargeback.Id.ToString(),
        new { evidence = request.Evidence.Count },
        request.AdminId.ToString()
      );
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error submitting chargeback dispute {chargebackId}", chargebackId);
      throw;
    }
  }

  // 7. LIST REFUNDS (for customer/admin)
  public async Task<PagedResult<RefundDto>> GetRefundsAsync(
    RefundFilter filter,
    int pageSize = 20)
  {
    var refunds = await _refundRepository.GetAsync(
      predicate: x =>
        (string.IsNullOrEmpty(filter.Status) || x.Status.ToString() == filter.Status) &&
        (filter.UserId == null || x.RequestedByUserId == filter.UserId) &&
        (filter.DateFrom == null || x.RequestedAt >= filter.DateFrom) &&
        (filter.DateTo == null || x.RequestedAt <= filter.DateTo),
      pageNumber: filter.PageNumber ?? 1,
      pageSize: pageSize,
      orderBy: q => q.OrderByDescending(x => x.RequestedAt)
    );

    return new PagedResult<RefundDto>
    {
      Items = refunds.Items.Select(MapToDto).ToList(),
      Total = refunds.Total,
      PageNumber = filter.PageNumber ?? 1,
      PageSize = pageSize
    };
  }

  private RefundDto MapToDto(Refund refund) => new RefundDto
  {
    Id = refund.Id,
    OrderId = refund.OrderId,
    Amount = refund.Amount,
    Type = refund.Type.ToString(),
    Status = refund.Status.ToString(),
    Reason = refund.Reason,
    RequestedAt = refund.RequestedAt,
    ProcessedAt = refund.ProcessedAt,
    IsDisputed = refund.IsDisputed
  };
}
```

---

## 3. API ENDPOINTS

```csharp
[ApiController]
[Route("api/v1/refunds")]
[Authorize]
public class RefundsController : ControllerBase
{
  private readonly IRefundService _refundService;

  // POST /api/v1/refunds (Customer requests refund)
  [HttpPost]
  [Authorize]
  public async Task<IActionResult> RequestRefund(
    [FromBody] RefundRequestDto request,
    [FromQuery] Guid orderId)
  {
    var userId = User.GetUserId();
    var result = await _refundService.RequestRefundAsync(orderId, userId, request);
    return Accepted(result);  // 202 Accepted
  }

  // GET /api/v1/refunds (List refunds for current user)
  [HttpGet]
  [Authorize]
  public async Task<IActionResult> GetMyRefunds([FromQuery] RefundFilter filter)
  {
    var userId = User.GetUserId();
    filter.UserId = userId;
    var result = await _refundService.GetRefundsAsync(filter);
    return Ok(result);
  }

  // GET /api/v1/refunds/{refundId} (Get refund details)
  [HttpGet("{refundId}")]
  [Authorize]
  public async Task<IActionResult> GetRefund(Guid refundId)
  {
    var result = await _refundService.GetRefundAsync(refundId);
    return Ok(result);
  }

  // POST /api/v1/refunds/{refundId}/approve (Admin approves)
  [HttpPost("{refundId}/approve")]
  [Authorize(Roles = "AdminPayments,AdminGeneral")]
  public async Task<IActionResult> ApproveRefund(
    Guid refundId,
    [FromBody] ApproveRefundRequest request)
  {
    var adminId = User.GetUserId();
    var adminName = User.GetName();
    request.AdminId = adminId;
    request.AdminName = adminName;

    var result = await _refundService.ApproveRefundAsync(refundId, adminId, request);
    return Ok(result);
  }

  // POST /api/v1/refunds/{refundId}/deny (Admin denies)
  [HttpPost("{refundId}/deny")]
  [Authorize(Roles = "AdminPayments,AdminGeneral")]
  public async Task<IActionResult> DenyRefund(
    Guid refundId,
    [FromBody] DenyRefundRequest request)
  {
    var result = await _refundService.DenyRefundAsync(refundId, request.Reason);
    return Ok(result);
  }

  // POST /api/v1/chargebacks/{chargebackId}/dispute (Admin disputes chargeback)
  [HttpPost("/api/v1/chargebacks/{chargebackId}/dispute")]
  [Authorize(Roles = "AdminPayments,AdminGeneral")]
  public async Task<IActionResult> DisputeChargeback(
    Guid chargebackId,
    [FromBody] DisputeChargebackRequest request)
  {
    await _refundService.DisputeChargebackAsync(chargebackId, request);
    return Ok(new { message = "Dispute submitted" });
  }
}
```

---

## 4. REFUND TIMELINE & SLA

```markdown
# Refund SLA

| Phase | Timeline | Action |
|-------|----------|--------|
| **Request** | T+0 | Customer solicita reembolso |
| **Admin Review** | T+0 a T+2 dias | Admin aprova/nega |
| **Processing** | T+2 a T+5 dias | Backend processa com provider |
| **Provider** | T+5 a T+10 dias | Provider processa (Stripe, etc) |
| **Customer** | T+10 a T+15 dias | Dinheiro volta na conta customer |
| **Deadline** | T+30 dias | Sem refund após 30 dias (exceto chargeback) |

## Chargeback Timeline
- **Disputa aberta:** T+0
- **Deadline para contestação:** T+7 dias (typical)
- **Resolução:** T+30-90 dias (depende do banco)
```

---

## 5. WEBHOOK HANDLING

```csharp
// Infrastructure/Webhooks/RefundWebhookHandler.cs
[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]
public class RefundWebhookController : ControllerBase
{
  private readonly IRefundService _refundService;
  private readonly IStripeWebhookValidator _validator;

  // POST /api/webhooks/stripe (Chargeback notification)
  [HttpPost("stripe")]
  public async Task<IActionResult> HandleStripeWebhook()
  {
    var json = await new StreamReader(Request.Body).ReadToEndAsync();
    var signature = Request.Headers["Stripe-Signature"];

    // Validar assinatura
    if (!_validator.ValidateWebhookSignature(json, signature))
      return Unauthorized();

    var eventData = JsonSerializer.Deserialize<StripeEvent>(json);

    if (eventData.Type == "charge.dispute.created")
    {
      var dto = JsonSerializer.Deserialize<ChargebackWebhookDto>(eventData.Data);
      await _refundService.HandleChargebackAsync(dto);
    }

    return Ok();  // Responder rápido
  }

  // POST /api/webhooks/mercadopago
  [HttpPost("mercadopago")]
  public async Task<IActionResult> HandleMercadoPagoWebhook()
  {
    // Similar ao Stripe
    return Ok();
  }
}
```

---

## 6. EMAIL TEMPLATES

```
Templates necessárias:

1. RefundRequestNotification (admin)
   - Order ID, customer, reason
   - Link para aprovar/negar

2. RefundApproved (customer)
   - Refund ID, amount
   - Timeline esperada

3. RefundCompleted (customer)
   - Confirmation
   - When money will appear

4. RefundFailed (customer)
   - Error reason
   - Contact support link

5. ChargebackAlert (admin)
   - 🚨 URGENT
   - Chargeback details
   - Action required by deadline

6. ChargebackResolved (customer)
   - Won/Lost indication
   - Timeline
```

---

## 7. REFUND DASHBOARD (Admin)

```typescript
// nodejsrc/app/(admin)/refunds/page.tsx
export default async function RefundsPage() {
  const refunds = await api.get('/refunds?status=Pending');

  return (
    <div className="space-y-4">
      <h1>Refunds Management</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div>Pending</div>
          <div className="text-2xl">{refunds.pending}</div>
        </Card>
        <Card>
          <div>Approved</div>
          <div className="text-2xl">{refunds.approved}</div>
        </Card>
        <Card>
          <div>Completed</div>
          <div className="text-2xl">{refunds.completed}</div>
        </Card>
        <Card>
          <div>Disputed</div>
          <div className="text-2xl text-red-600">{refunds.disputed}</div>
        </Card>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Refund ID</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {refunds.map(refund => (
            <TableRow key={refund.id}>
              <TableCell>{refund.id}</TableCell>
              <TableCell>{refund.orderId}</TableCell>
              <TableCell>${refund.amount}</TableCell>
              <TableCell>
                <Badge status={refund.status}>
                  {refund.status}
                </Badge>
              </TableCell>
              <TableCell>{refund.reason}</TableCell>
              <TableCell>{format(new Date(refund.requestedAt))}</TableCell>
              <TableCell>
                {refund.status === 'Pending' && (
                  <>
                    <Button onClick={() => approve(refund.id)}>Approve</Button>
                    <Button onClick={() => deny(refund.id)}>Deny</Button>
                  </>
                )}
                {refund.isDisputed && (
                  <Button 
                    onClick={() => goToChargeback(refund.id)}
                    className="bg-red-600"
                  >
                    View Chargeback
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 8. REFUND CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: refunds table
- [ ] Migration: refund_items table
- [ ] Migration: chargebacks table
- [ ] Indexes created
- [ ] Foreign keys configured

### Backend
- [ ] Refund entity + value objects
- [ ] RefundRepository implementation
- [ ] RefundService (8 main methods)
- [ ] RefundController (7 endpoints)
- [ ] Webhook handler (Stripe + Mercado Pago)
- [ ] Email service integration
- [ ] Inventory reversal logic
- [ ] Audit logging

### API
- [ ] POST /refunds (request)
- [ ] GET /refunds (list)
- [ ] GET /refunds/{id} (detail)
- [ ] POST /refunds/{id}/approve (admin)
- [ ] POST /refunds/{id}/deny (admin)
- [ ] POST /chargebacks/{id}/dispute (admin)
- [ ] Webhook endpoint for chargebacks

### Testing
- [ ] Unit: RefundService methods
- [ ] Unit: Refund state transitions
- [ ] Integration: Stripe mock refund
- [ ] Integration: Inventory reversal
- [ ] E2E: Full refund workflow
- [ ] E2E: Chargeback handling

### Admin UI
- [ ] Refund dashboard
- [ ] Refund list with filters
- [ ] Approve/Deny interface
- [ ] Chargeback viewer
- [ ] Dispute submission form

### Customer UI
- [ ] Request refund button (on order detail)
- [ ] Refund request form
- [ ] Refund status tracker
- [ ] Email notifications

### Documentation
- [ ] Refund API docs
- [ ] Webhook documentation
- [ ] SLA documentation
- [ ] Admin guide
```

---

**Refund & Chargeback System Completo ✅**
