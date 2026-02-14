# EMAIL NOTIFICATION SYSTEM - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Email templates, background jobs, multi-provider support, transactional emails

---

## 1. EMAIL SERVICE ARCHITECTURE

### 1.1 Email Provider Abstraction

```csharp
// Domain/Interfaces/IEmailProvider.cs
public interface IEmailProvider
{
  Task<EmailSendResult> SendAsync(EmailMessage message);
  Task<bool> ValidateEmailAsync(string email);
  Task<IEnumerable<string>> GetUnsubscribedAsync();
}

public interface IEmailService
{
  Task SendWelcomeEmailAsync(User user);
  Task SendEmailVerificationAsync(User user, string verificationToken);
  Task SendPasswordResetAsync(User user, string resetToken);
  Task SendOrderConfirmationAsync(Order order);
  Task SendPaymentProcessedAsync(Payment payment, Order order);
  Task SendOrderShippedAsync(Order order, string trackingUrl);
  Task SendRefundNotificationAsync(Refund refund, Order order);
  Task SendChargebackAlertAsync(Chargeback chargeback, Order order);
  Task SendNewsletterAsync(Newsletter newsletter, IEnumerable<string> recipients);
  Task SendAdminAlertAsync(string subject, string htmlContent);
}

public class EmailMessage
{
  public string To { get; set; }
  public string Cc { get; set; }
  public string Bcc { get; set; }
  public string Subject { get; set; }
  public string HtmlBody { get; set; }
  public string PlainTextBody { get; set; }
  public List<EmailAttachment> Attachments { get; set; }
  public string ReplyTo { get; set; }
  public Dictionary<string, string> Headers { get; set; }  // Tracking pixels, etc
  public EmailPriority Priority { get; set; }
}

public enum EmailPriority
{
  Low,
  Normal,
  High
}

public class EmailSendResult
{
  public bool Success { get; set; }
  public string MessageId { get; set; }
  public string ErrorMessage { get; set; }
  public DateTime SentAt { get; set; }
}
```

### 1.2 SendGrid Implementation

```csharp
// Infrastructure/Email/SendGridEmailProvider.cs
public class SendGridEmailProvider : IEmailProvider
{
  private readonly SendGridClient _client;
  private readonly ILogger<SendGridEmailProvider> _logger;

  public SendGridEmailProvider(string apiKey, ILogger<SendGridEmailProvider> logger)
  {
    _client = new SendGridClient(apiKey);
    _logger = logger;
  }

  public async Task<EmailSendResult> SendAsync(EmailMessage message)
  {
    var from = new EmailAddress("noreply@loja.com.br", "Loja de Produtos");
    var to = new EmailAddress(message.To);
    var mail = new SendGridMessage
    {
      From = from,
      Subject = message.Subject,
      HtmlContent = message.HtmlBody,
      PlainTextContent = message.PlainTextBody,
      Priority = message.Priority switch
      {
        EmailPriority.High => 1,
        EmailPriority.Low => 3,
        _ => 2
      }
    };

    mail.AddTo(to);

    // CC/BCC
    if (!string.IsNullOrEmpty(message.Cc))
      mail.AddCc(new EmailAddress(message.Cc));
    if (!string.IsNullOrEmpty(message.Bcc))
      mail.AddBcc(new EmailAddress(message.Bcc));

    // Reply-To
    if (!string.IsNullOrEmpty(message.ReplyTo))
      mail.ReplyToList = new List<EmailAddress> { new EmailAddress(message.ReplyTo) };

    // Attachments
    if (message.Attachments?.Any() == true)
    {
      foreach (var attachment in message.Attachments)
      {
        mail.AddAttachment(
          filename: attachment.FileName,
          fileContent: attachment.FileContent,
          type: attachment.ContentType
        );
      }
    }

    // Custom headers (tracking pixel, etc)
    if (message.Headers?.Any() == true)
    {
      foreach (var header in message.Headers)
      {
        mail.AddHeader(header.Key, header.Value);
      }
    }

    try
    {
      var response = await _client.SendEmailAsync(mail);

      if (response.IsSuccessful)
      {
        _logger.LogInformation("Email sent to {email} with ID {messageId}",
          message.To, response.Headers.GetValues("X-Message-Id").FirstOrDefault());

        return new EmailSendResult
        {
          Success = true,
          MessageId = response.Headers.GetValues("X-Message-Id").FirstOrDefault(),
          SentAt = DateTime.UtcNow
        };
      }
      else
      {
        _logger.LogWarning("Failed to send email to {email}: {statusCode}",
          message.To, response.StatusCode);

        return new EmailSendResult
        {
          Success = false,
          ErrorMessage = $"SendGrid returned {response.StatusCode}"
        };
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error sending email to {email}", message.To);
      return new EmailSendResult
      {
        Success = false,
        ErrorMessage = ex.Message
      };
    }
  }

  public async Task<bool> ValidateEmailAsync(string email)
  {
    // Usar SendGrid validation API
    var response = await _client.RequestAsync(
      method: SendGridClient.Method.Get,
      urlPath: "/v3/validations/email",
      queryParams: new Dictionary<string, string> { { "email", email } }
    );

    return response.IsSuccessful;
  }

  public async Task<IEnumerable<string>> GetUnsubscribedAsync()
  {
    // Retornar unsubscribed list
    var response = await _client.RequestAsync(
      method: SendGridClient.Method.Get,
      urlPath: "/v3/suppression/unsubscribes",
      queryParams: new Dictionary<string, string> { { "limit", "500" } }
    );

    // Parse response
    return new List<string>();
  }
}

// Program.cs
services.AddSingleton<IEmailProvider>(sp =>
  new SendGridEmailProvider(
    configuration["SendGrid:ApiKey"],
    sp.GetRequiredService<ILogger<SendGridEmailProvider>>()
  )
);
```

### 1.3 SMTP Fallback

```csharp
// Infrastructure/Email/SmtpEmailProvider.cs
public class SmtpEmailProvider : IEmailProvider
{
  private readonly SmtpClient _smtpClient;
  private readonly string _fromEmail;
  private readonly ILogger<SmtpEmailProvider> _logger;

  public SmtpEmailProvider(IOptions<SmtpSettings> options, ILogger<SmtpEmailProvider> logger)
  {
    var settings = options.Value;
    _smtpClient = new SmtpClient(settings.Host)
    {
      Port = settings.Port,
      EnableSsl = settings.EnableSsl,
      Credentials = new NetworkCredential(settings.Username, settings.Password)
    };
    _fromEmail = settings.FromEmail;
    _logger = logger;
  }

  public async Task<EmailSendResult> SendAsync(EmailMessage message)
  {
    try
    {
      using (var mailMessage = new MailMessage(_fromEmail, message.To))
      {
        mailMessage.Subject = message.Subject;
        mailMessage.Body = message.HtmlBody;
        mailMessage.IsBodyHtml = true;

        if (!string.IsNullOrEmpty(message.PlainTextBody))
        {
          // Usar AlternateView para plain text
          var plainTextView = AlternateView.CreateAlternateViewFromString(
            message.PlainTextBody, null, "text/plain");
          mailMessage.AlternateViews.Add(plainTextView);
        }

        if (!string.IsNullOrEmpty(message.ReplyTo))
          mailMessage.ReplyToList.Add(new MailAddress(message.ReplyTo));

        if (message.Attachments?.Any() == true)
        {
          foreach (var attachment in message.Attachments)
          {
            mailMessage.Attachments.Add(
              new System.Net.Mail.Attachment(
                new MemoryStream(attachment.FileContent),
                attachment.FileName,
                attachment.ContentType
              )
            );
          }
        }

        await _smtpClient.SendMailAsync(mailMessage);

        _logger.LogInformation("Email sent to {email} via SMTP", message.To);

        return new EmailSendResult
        {
          Success = true,
          SentAt = DateTime.UtcNow
        };
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error sending email to {email} via SMTP", message.To);
      return new EmailSendResult
      {
        Success = false,
        ErrorMessage = ex.Message
      };
    }
  }

  public Task<bool> ValidateEmailAsync(string email)
  {
    // Regex validation (básico)
    var isValid = Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    return Task.FromResult(isValid);
  }

  public Task<IEnumerable<string>> GetUnsubscribedAsync()
  {
    return Task.FromResult(Enumerable.Empty<string>());
  }
}
```

---

## 2. EMAIL SERVICE IMPLEMENTATION

```csharp
// Application/Services/EmailService.cs
public class EmailService : IEmailService
{
  private readonly IEmailProvider _emailProvider;
  private readonly IEmailTemplateRepository _templateRepository;
  private readonly IEmailQueueService _queueService;
  private readonly ILogger<EmailService> _logger;

  public EmailService(
    IEmailProvider emailProvider,
    IEmailTemplateRepository templateRepository,
    IEmailQueueService queueService,
    ILogger<EmailService> logger)
  {
    _emailProvider = emailProvider;
    _templateRepository = templateRepository;
    _queueService = queueService;
    _logger = logger;
  }

  // 1. WELCOME EMAIL
  public async Task SendWelcomeEmailAsync(User user)
  {
    var template = await _templateRepository.GetByNameAsync("WelcomeEmail");
    var html = RenderTemplate(template, new { user.Name, user.Email });

    var message = new EmailMessage
    {
      To = user.Email,
      Subject = "Bem-vindo à Loja de Produtos!",
      HtmlBody = html,
      Priority = EmailPriority.Normal
    };

    await _queueService.EnqueueAsync(message);
    _logger.LogInformation("Welcome email queued for {email}", user.Email);
  }

  // 2. EMAIL VERIFICATION
  public async Task SendEmailVerificationAsync(User user, string verificationToken)
  {
    var template = await _templateRepository.GetByNameAsync("EmailVerification");
    var verificationUrl = $"https://loja.com.br/verify-email?token={verificationToken}";
    
    var html = RenderTemplate(template, new
    {
      user.Name,
      user.Email,
      VerificationUrl = verificationUrl,
      ExpiresIn = "24 horas"
    });

    var message = new EmailMessage
    {
      To = user.Email,
      Subject = "Confirme seu Email - Loja de Produtos",
      HtmlBody = html,
      Priority = EmailPriority.High
    };

    await _queueService.EnqueueAsync(message);
  }

  // 3. PASSWORD RESET
  public async Task SendPasswordResetAsync(User user, string resetToken)
  {
    var template = await _templateRepository.GetByNameAsync("PasswordReset");
    var resetUrl = $"https://loja.com.br/reset-password?token={resetToken}";
    
    var html = RenderTemplate(template, new
    {
      user.Name,
      ResetUrl = resetUrl,
      ExpiresIn = "1 hora"
    });

    var message = new EmailMessage
    {
      To = user.Email,
      Subject = "Resetar sua Senha - Loja de Produtos",
      HtmlBody = html,
      Priority = EmailPriority.High
    };

    await _queueService.EnqueueAsync(message);
  }

  // 4. ORDER CONFIRMATION
  public async Task SendOrderConfirmationAsync(Order order)
  {
    var template = await _templateRepository.GetByNameAsync("OrderConfirmation");
    
    var html = RenderTemplate(template, new
    {
      CustomerName = order.User.Name,
      OrderId = order.Id,
      OrderDate = order.CreatedAt,
      Items = order.Items.Select(x => new
      {
        x.ProductName,
        x.Quantity,
        x.UnitPrice,
        Subtotal = x.Quantity * x.UnitPrice
      }),
      Subtotal = order.Subtotal,
      Discount = order.DiscountAmount,
      ShippingCost = order.ShippingCost,
      Total = order.Total,
      ShippingAddress = order.ShippingAddress,
      TrackingUrl = $"https://loja.com.br/orders/{order.Id}/tracking"
    });

    var message = new EmailMessage
    {
      To = order.User.Email,
      Subject = $"Pedido confirmado - #{order.Id}",
      HtmlBody = html,
      Priority = EmailPriority.Normal
    };

    await _queueService.EnqueueAsync(message);
  }

  // 5. PAYMENT PROCESSED
  public async Task SendPaymentProcessedAsync(Payment payment, Order order)
  {
    var template = await _templateRepository.GetByNameAsync("PaymentProcessed");
    
    var html = RenderTemplate(template, new
    {
      CustomerName = order.User.Name,
      OrderId = order.Id,
      Amount = payment.Amount,
      PaymentMethod = payment.Method,
      TransactionId = payment.ExternalPaymentId,
      ProcessedAt = payment.ProcessedAt,
      ReceiptUrl = $"https://loja.com.br/orders/{order.Id}/receipt"
    });

    var message = new EmailMessage
    {
      To = order.User.Email,
      Subject = $"Pagamento Recebido - Pedido #{order.Id}",
      HtmlBody = html,
      Priority = EmailPriority.Normal
    };

    await _queueService.EnqueueAsync(message);
  }

  // 6. ORDER SHIPPED
  public async Task SendOrderShippedAsync(Order order, string trackingUrl)
  {
    var template = await _templateRepository.GetByNameAsync("OrderShipped");
    
    var html = RenderTemplate(template, new
    {
      CustomerName = order.User.Name,
      OrderId = order.Id,
      Items = order.Items.Select(x => new { x.ProductName, x.Quantity }),
      ShippingAddress = order.ShippingAddress,
      TrackingUrl = trackingUrl,
      EstimatedDelivery = order.EstimatedDeliveryDate
    });

    var message = new EmailMessage
    {
      To = order.User.Email,
      Subject = $"Seu pedido foi enviado! - #{order.Id}",
      HtmlBody = html,
      Priority = EmailPriority.Normal
    };

    await _queueService.EnqueueAsync(message);
  }

  // 7. REFUND NOTIFICATION
  public async Task SendRefundNotificationAsync(Refund refund, Order order)
  {
    var template = await _templateRepository.GetByNameAsync("RefundNotification");
    
    var html = RenderTemplate(template, new
    {
      CustomerName = order.User.Name,
      OrderId = order.Id,
      RefundAmount = refund.Amount,
      Reason = refund.Reason,
      Status = refund.Status.ToString(),
      ExpectedDate = DateTime.UtcNow.AddDays(5),
      SupportUrl = "https://loja.com.br/support"
    });

    var message = new EmailMessage
    {
      To = order.User.Email,
      Subject = $"Seu reembolso - #{refund.Id}",
      HtmlBody = html,
      Priority = EmailPriority.Normal
    };

    await _queueService.EnqueueAsync(message);
  }

  // 8. CHARGEBACK ALERT (Admin)
  public async Task SendChargebackAlertAsync(Chargeback chargeback, Order order)
  {
    var template = await _templateRepository.GetByNameAsync("ChargebackAlert");
    
    var html = RenderTemplate(template, new
    {
      OrderId = order.Id,
      CustomerId = order.UserId,
      Amount = chargeback.Amount,
      ReasonCode = chargeback.ReasonCode,
      Status = chargeback.Status,
      DisputeDeadline = chargeback.DisputeDeadlineAt,
      AdminUrl = "https://admin.loja.com.br/chargebacks"
    });

    var message = new EmailMessage
    {
      To = "admin@loja.com.br",
      Subject = "🚨 CHARGEBACK - Ação Necessária",
      HtmlBody = html,
      Priority = EmailPriority.High
    };

    await _queueService.EnqueueAsync(message);
  }

  // 9. NEWSLETTER
  public async Task SendNewsletterAsync(Newsletter newsletter, IEnumerable<string> recipients)
  {
    var template = await _templateRepository.GetByNameAsync("Newsletter");
    
    foreach (var email in recipients)
    {
      var unsubscribeUrl = $"https://loja.com.br/newsletter/unsubscribe?email={email}";
      var html = RenderTemplate(template, new
      {
        Title = newsletter.Title,
        Content = newsletter.HtmlContent,
        UnsubscribeUrl = unsubscribeUrl
      });

      var message = new EmailMessage
      {
        To = email,
        Subject = newsletter.Subject,
        HtmlBody = html,
        Priority = EmailPriority.Low
      };

      await _queueService.EnqueueAsync(message);
    }
  }

  // Render Liquid template with data
  private string RenderTemplate(EmailTemplate template, object data)
  {
    var engine = new FluidEngine();
    var source = engine.Parse(template.HtmlContent);
    var context = new TemplateContext(data);
    return source.Render(context);
  }
}
```

---

## 3. BACKGROUND JOB PROCESSING

### 3.1 Email Queue Service (using Hangfire)

```csharp
// Infrastructure/Email/EmailQueueService.cs
public interface IEmailQueueService
{
  Task EnqueueAsync(EmailMessage message);
  Task<IEnumerable<EmailLog>> GetRecentLogsAsync(int days = 7);
}

public class EmailQueueService : IEmailQueueService
{
  private readonly IBackgroundJobClient _jobClient;
  private readonly IEmailProvider _emailProvider;
  private readonly IEmailLogRepository _logRepository;
  private readonly ILogger<EmailQueueService> _logger;

  public EmailQueueService(
    IBackgroundJobClient jobClient,
    IEmailProvider emailProvider,
    IEmailLogRepository logRepository,
    ILogger<EmailQueueService> logger)
  {
    _jobClient = jobClient;
    _emailProvider = emailProvider;
    _logRepository = logRepository;
    _logger = logger;
  }

  public async Task EnqueueAsync(EmailMessage message)
  {
    // Enqueue job com retry
    _jobClient.Enqueue<IEmailSender>(x => x.SendAsync(message));
    
    // Log to database
    var log = new EmailLog
    {
      To = message.To,
      Subject = message.Subject,
      Status = "Queued",
      QueuedAt = DateTime.UtcNow
    };

    await _logRepository.AddAsync(log);
    _logger.LogInformation("Email queued for {email}: {subject}", message.To, message.Subject);
  }

  public async Task<IEnumerable<EmailLog>> GetRecentLogsAsync(int days = 7)
  {
    return await _logRepository.GetAsync(
      predicate: x => x.QueuedAt > DateTime.UtcNow.AddDays(-days),
      orderBy: q => q.OrderByDescending(x => x.QueuedAt)
    );
  }
}

// Infrastructure/Email/EmailSender.cs
public interface IEmailSender
{
  Task SendAsync(EmailMessage message);
}

public class EmailSender : IEmailSender
{
  private readonly IEmailProvider _emailProvider;
  private readonly IEmailLogRepository _logRepository;
  private readonly ILogger<EmailSender> _logger;
  private const int MAX_RETRIES = 3;

  public EmailSender(
    IEmailProvider emailProvider,
    IEmailLogRepository logRepository,
    ILogger<EmailSender> logger)
  {
    _emailProvider = emailProvider;
    _logRepository = logRepository;
    _logger = logger;
  }

  [AutomaticRetry(Attempts = MAX_RETRIES, DelaysInSeconds = new[] { 60, 300, 900 })]
  public async Task SendAsync(EmailMessage message)
  {
    try
    {
      var result = await _emailProvider.SendAsync(message);

      var log = new EmailLog
      {
        To = message.To,
        Subject = message.Subject,
        Status = result.Success ? "Sent" : "Failed",
        ExternalMessageId = result.MessageId,
        ErrorMessage = result.ErrorMessage,
        SentAt = result.SentAt
      };

      await _logRepository.AddAsync(log);

      if (result.Success)
      {
        _logger.LogInformation("Email sent to {email} with ID {messageId}",
          message.To, result.MessageId);
      }
      else
      {
        _logger.LogWarning("Failed to send email to {email}: {error}",
          message.To, result.ErrorMessage);
        throw new Exception($"Failed to send email: {result.ErrorMessage}");
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error sending email to {email}", message.To);
      throw;  // Hangfire retries on exception
    }
  }
}

// Program.cs - Register Hangfire
services.AddHangfire(config =>
  config.UseSqlServerStorage(configuration.GetConnectionString("DefaultConnection")));

services.AddHangfireServer();
```

---

## 4. EMAIL TEMPLATES (HTML)

```html
<!-- Templates/OrderConfirmation.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #333; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table td { padding: 10px; border: 1px solid #ddd; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pedido Confirmado</h1>
    </div>

    <div class="content">
      <p>Olá {{ CustomerName }},</p>

      <p>Seu pedido foi confirmado! Aqui está um resumo:</p>

      <h3>Detalhes do Pedido</h3>
      <p><strong>Número:</strong> {{ OrderId }}</p>
      <p><strong>Data:</strong> {{ OrderDate | date: "dd/MM/yyyy" }}</p>

      <h3>Itens</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Preço</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {% for item in Items %}
          <tr>
            <td>{{ item.ProductName }}</td>
            <td>{{ item.Quantity }}</td>
            <td>R$ {{ item.UnitPrice | money }}</td>
            <td>R$ {{ item.Subtotal | money }}</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>

      <h3>Resumo</h3>
      <p>Subtotal: R$ {{ Subtotal | money }}</p>
      <p>Desconto: -R$ {{ Discount | money }}</p>
      <p>Frete: R$ {{ ShippingCost | money }}</p>
      <p class="total">Total: R$ {{ Total | money }}</p>

      <h3>Endereço de Entrega</h3>
      <p>{{ ShippingAddress }}</p>

      <p>
        <a href="{{ TrackingUrl }}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">
          Acompanhar Pedido
        </a>
      </p>

      <p>Obrigado por sua compra!</p>
    </div>
  </div>
</body>
</html>

<!-- Templates/PaymentProcessed.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-box">
      <h2>✓ Pagamento Recebido</h2>
      
      <p>Olá {{ CustomerName }},</p>

      <p>Confirmamos o recebimento do seu pagamento!</p>

      <p>
        <strong>Pedido:</strong> {{ OrderId }}<br>
        <strong>Valor:</strong> R$ {{ Amount | money }}<br>
        <strong>Método:</strong> {{ PaymentMethod }}<br>
        <strong>Transação:</strong> {{ TransactionId }}<br>
        <strong>Data:</strong> {{ ProcessedAt | date: "dd/MM/yyyy HH:mm" }}
      </p>

      <p>Seu pedido será processado e enviado em breve.</p>

      <p>
        <a href="{{ ReceiptUrl }}">Baixar Recibo</a>
      </p>
    </div>
  </div>
</body>
</html>

<!-- Templates/ChargebackAlert.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; color: #721c24; }
    .deadline { font-weight: bold; color: red; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>🚨 CHARGEBACK RECEBIDO</h2>
      
      <p><strong>Ação imediata necessária!</strong></p>

      <p>
        <strong>Pedido:</strong> {{ OrderId }}<br>
        <strong>Cliente:</strong> {{ CustomerId }}<br>
        <strong>Valor:</strong> R$ {{ Amount | money }}<br>
        <strong>Motivo:</strong> {{ ReasonCode }}<br>
        <strong>Status:</strong> {{ Status }}<br>
        <strong class="deadline">Deadline para contestação: {{ DisputeDeadline | date: "dd/MM/yyyy HH:mm" }}</strong>
      </p>

      <p>
        <a href="{{ AdminUrl }}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none;">
          Ir para Painel Admin
        </a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 5. EMAIL TRACKING & LOGGING

```csharp
// Domain/Entities/EmailLog.cs
public class EmailLog
{
  public Guid Id { get; set; }
  public string To { get; set; }
  public string Subject { get; set; }
  public string Status { get; set; }              // Queued, Sent, Failed, Opened, Clicked
  public string ExternalMessageId { get; set; }  // SendGrid message ID
  public string ErrorMessage { get; set; }
  public DateTime QueuedAt { get; set; }
  public DateTime? SentAt { get; set; }
  public DateTime? OpenedAt { get; set; }
  public int OpenCount { get; set; }
  public List<string> ClickedLinks { get; set; }
  
  // Webhook data
  public string EventData { get; set; }
}

// Webhook para tracking (SendGrid events)
[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]
public class EmailWebhookController : ControllerBase
{
  private readonly IEmailLogRepository _logRepository;

  [HttpPost("sendgrid")]
  public async Task<IActionResult> HandleSendGridWebhook([FromBody] SendGridEvent[] events)
  {
    foreach (var @event in events)
    {
      var log = await _logRepository.GetByExternalIdAsync(@event.MessageId);
      if (log == null) continue;

      switch (@event.Event)
      {
        case "delivered":
          log.Status = "Sent";
          log.SentAt = @event.Timestamp;
          break;
        case "open":
          log.Status = "Opened";
          log.OpenedAt = @event.Timestamp;
          log.OpenCount++;
          break;
        case "click":
          log.ClickedLinks.Add(@event.Url);
          break;
        case "bounce":
        case "dropped":
          log.Status = "Failed";
          log.ErrorMessage = @event.Reason;
          break;
      }

      await _logRepository.UpdateAsync(log);
    }

    return Ok();
  }
}
```

---

## 6. EMAIL CONFIGURATION

```csharp
// appsettings.json
{
  "Email": {
    "Provider": "SendGrid",  // ou "Smtp"
    "From": "noreply@loja.com.br",
    "FromName": "Loja de Produtos"
  },
  "SendGrid": {
    "ApiKey": "${SENDGRID_API_KEY}"
  },
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "EnableSsl": true,
    "Username": "${SMTP_USERNAME}",
    "Password": "${SMTP_PASSWORD}",
    "FromEmail": "noreply@loja.com.br"
  },
  "Hangfire": {
    "Enabled": true,
    "WorkerCount": 5,
    "MaximumRetryAttempts": 3
  }
}

// Program.cs
var emailProvider = configuration["Email:Provider"];
if (emailProvider == "SendGrid")
{
  services.AddScoped<IEmailProvider>(sp =>
    new SendGridEmailProvider(
      configuration["SendGrid:ApiKey"],
      sp.GetRequiredService<ILogger<SendGridEmailProvider>>()
    )
  );
}
else
{
  services.AddScoped<IEmailProvider>(sp =>
    new SmtpEmailProvider(
      Options.Create(configuration.GetSection("Smtp").Get<SmtpSettings>()),
      sp.GetRequiredService<ILogger<SmtpEmailProvider>>()
    )
  );
}

services.AddScoped<IEmailService, EmailService>();
services.AddScoped<IEmailQueueService, EmailQueueService>();
services.AddScoped<IEmailSender, EmailSender>();
```

---

## 7. EMAIL CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: email_logs table
- [ ] Migration: email_templates table
- [ ] Indexes created

### Backend
- [ ] IEmailProvider interface
- [ ] SendGridEmailProvider implementation
- [ ] SmtpEmailProvider implementation
- [ ] IEmailService interface
- [ ] EmailService implementation
- [ ] IEmailQueueService interface
- [ ] EmailQueueService implementation
- [ ] EmailSender background job
- [ ] EmailLog entity

### Services
- [ ] SendWelcomeEmailAsync
- [ ] SendEmailVerificationAsync
- [ ] SendPasswordResetAsync
- [ ] SendOrderConfirmationAsync
- [ ] SendPaymentProcessedAsync
- [ ] SendOrderShippedAsync
- [ ] SendRefundNotificationAsync
- [ ] SendChargebackAlertAsync
- [ ] SendNewsletterAsync

### Email Templates (9)
- [ ] WelcomeEmail.html
- [ ] EmailVerification.html
- [ ] PasswordReset.html
- [ ] OrderConfirmation.html
- [ ] PaymentProcessed.html
- [ ] OrderShipped.html
- [ ] RefundNotification.html
- [ ] ChargebackAlert.html
- [ ] Newsletter.html

### Configuration
- [ ] SendGrid API key in secrets
- [ ] Hangfire SQL server storage
- [ ] Email provider selection (SendGrid vs SMTP)
- [ ] Retry policy configured

### Webhooks
- [ ] SendGrid webhook endpoint
- [ ] Signature validation
- [ ] Event processing (delivered, open, click, bounce)

### Testing
- [ ] Unit: Email template rendering
- [ ] Unit: Email service methods
- [ ] Integration: Hangfire job execution
- [ ] Integration: Mock SendGrid API
- [ ] E2E: Full email flow

### Monitoring
- [ ] Email dashboard (sent/failed/opened)
- [ ] Alert on high failure rate
- [ ] Logs in Serilog + App Insights
```

---

**Email Notification System Completo ✅**
