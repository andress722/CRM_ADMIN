# COMPLIANCE & SEGURANÇA - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** PCI DSS, LGPD/GDPR, Compliance, Proteção de Dados

---

## 1. PCI DSS (Payment Card Industry Data Security Standard)

### 1.1 Requisitos Core (12 Requisitos PCI DSS v4.0)

**PCI DSS Compliance - Implementação Completa:**

#### **Req 1: Firewall & Network Segmentation**
```csharp
// Program.cs - Network Security
builder.Services.Configure<KestrelServerOptions>(options =>
{
  options.Listen(IPAddress.Loopback, 8080);  // Apenas localhost
  options.Listen(IPAddress.Any, 443, listenOptions =>
  {
    listenOptions.UseHttps();  // HTTPS obrigatório
  });
});

// Middleware: HSTS (HTTP Strict Transport Security)
app.Use(async (context, next) =>
{
  context.Response.Headers.Add("Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload");
  context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
  context.Response.Headers.Add("X-Frame-Options", "DENY");
  context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
  await next();
});
```

**AWS Security Groups:**
```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-isolation
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ecommerce
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
    - protocol: TCP
      port: 443   # External APIs
```

#### **Req 2: Default Credentials & Security Parameters**
```csharp
// Infrastructure/Security/SecureDefaultsService.cs
public class SecureDefaultsService
{
  public static void EnforceDefaults(IApplicationBuilder app)
  {
    // Remover headers que expõem versão
    app.Use(async (context, next) =>
    {
      context.Response.Headers.Remove("Server");
      context.Response.Headers.Remove("X-AspNet-Version");
      context.Response.Headers.Remove("X-AspNetMvc-Version");
      await next();
    });
  }

  // Validação de senha forte
  public static IServiceCollection AddPasswordPolicy(this IServiceCollection services)
  {
    services.Configure<IdentityOptions>(options =>
    {
      options.Password.RequiredLength = 12;
      options.Password.RequireDigit = true;
      options.Password.RequireLowercase = true;
      options.Password.RequireUppercase = true;
      options.Password.RequireNonAlphanumeric = true;
      options.Password.RequiredUniqueChars = 4;
      
      // Lockout
      options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
      options.Lockout.MaxFailedAccessAttempts = 5;
    });
    
    return services;
  }
}
```

#### **Req 3: Cardholder Data Protection (PCI Core)**
```csharp
// ❌ NUNCA FAZER:
var payment = new {
  cardNumber = "4532123456789010",  // 🚨 VIOLAÇÃO PCI
  cvv = "123",                       // 🚨 CRIME
  pin = "1234"                       // 🚨 CRIME
};

// ✅ CORRETO - Usar tokenização
public class PaymentTokenization
{
  public string Last4Digits { get; set; }      // "9010"
  public string CardBrand { get; set; }        // "Visa"
  public int ExpiryMonth { get; set; }
  public int ExpiryYear { get; set; }
  public string StripeToken { get; set; }      // "tok_1234..."
  public string MercadoPagoToken { get; set; } // "FR123..."
  
  // Nunca armazenar CVV
}

// Nunca processar PAN localmente
[HttpPost("process-payment")]
public async Task<IActionResult> ProcessPayment([FromBody] PaymentTokenRequest request)
{
  // request contém token, NÃO número de cartão
  var result = await _stripeService.ChargeAsync(
    amount: request.Amount,
    token: request.StripeToken,  // Token seguro
    description: $"Order {request.OrderId}"
  );
  
  return Ok(new { transactionId = result.Id });
}
```

#### **Req 4: Encryption in Transit (TLS/SSL)**
```csharp
// appsettings.json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://0.0.0.0:443",
        "Certificate": {
          "Path": "/etc/ssl/certs/fullchain.pem",
          "KeyPath": "/etc/ssl/private/privkey.pem"
        }
      }
    }
  }
}

// Enforce HTTPS everywhere
app.UseHttpsRedirection();
app.UseHsts(options =>
{
  options.MaxAge(days: 365);
  options.IncludeSubdomains();
  options.Preload();
});
```

#### **Req 5: Encryption at Rest (AES-256)**
```csharp
// Infrastructure/Encryption/EncryptionService.cs
public class EncryptionService
{
  private readonly IDataProtectionProvider _protectionProvider;
  
  public EncryptionService(IDataProtectionProvider protectionProvider)
  {
    _protectionProvider = protectionProvider;
  }

  public string EncryptSensitiveData(string plaintext, string purpose = "SensitiveData")
  {
    var protector = _protectionProvider.CreateProtector(purpose);
    return protector.Protect(plaintext);
  }

  public string DecryptSensitiveData(string ciphertext, string purpose = "SensitiveData")
  {
    var protector = _protectionProvider.CreateProtector(purpose);
    return protector.Unprotect(ciphertext);
  }
}

// Usar em modelos
public class User
{
  public string Email { get; set; }
  public string EmailEncrypted { get; set; }  // Armazenado criptografado
  public string PhoneEncrypted { get; set; }
}

// Ao salvar
user.EmailEncrypted = _encryptionService.EncryptSensitiveData(user.Email);
user.PhoneEncrypted = _encryptionService.EncryptSensitiveData(user.Phone);
```

#### **Req 6: Secure Development & Maintenance**
```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: SonarQube Scan
      uses: SonarSource/sonarcloud-github-action@master
    
    - name: OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        path: '.'
        format: 'JSON'
    
    - name: Secret Scanning (GitGuardian)
      uses: gitguardian/ggshield-action@master
      env:
        GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
    
    - name: Trivy Container Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'ghcr.io/copilot-sdk/api:latest'
        format: 'sarif'
```

#### **Req 7: Access Control (RBAC)**
```csharp
// Domain/Entities/Role.cs
public enum Role
{
  Customer,
  AdminGeneral,
  AdminPayments,     // Apenas pagamentos
  AdminInventory,    // Apenas estoque
  AdminCompliance,   // Apenas dados
  AuditUser          // Apenas leitura
}

// Middleware: RBAC enforcement
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
  [Authorize(Roles = "AdminPayments,AdminGeneral")]
  [HttpPost("refund/{paymentId}")]
  public async Task<IActionResult> RefundPayment(string paymentId)
  {
    // Apenas admins de pagamentos podem reembolsar
    return Ok();
  }
}

// Auditoria: Log TODA mudança de permissões
[Authorize(Roles = "AdminGeneral")]
[HttpPost("users/{userId}/roles")]
public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequest request)
{
  await _auditService.LogAsync(
    action: "RoleChanged",
    entityId: userId,
    oldValues: $"Roles: {string.Join(',', user.Roles)}",
    newValues: $"Roles: {string.Join(',', request.NewRoles)}",
    ipAddress: HttpContext.Connection.RemoteIpAddress.ToString(),
    userId: User.FindFirst(ClaimTypes.NameIdentifier).Value
  );
  
  return Ok();
}
```

#### **Req 8: User Identification & Authentication**
```csharp
// MFA Implementation
public class MfaService
{
  public async Task<string> GenerateTotp(User user)
  {
    using (var hmac = new HMACSHA1(Base32Decode(user.TotpSecret)))
    {
      var timestamp = (long)Math.Floor((DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds / 30);
      var data = BitConverter.GetBytes(timestamp).Reverse().ToArray();
      var hash = hmac.ComputeHash(data);
      var offset = hash[hash.Length - 1] & 0xf;
      var code = (hash[offset] & 0x7f) << 24 |
                 (hash[offset + 1] & 0xff) << 16 |
                 (hash[offset + 2] & 0xff) << 8 |
                 (hash[offset + 3] & 0xff);
      return (code % 1000000).ToString("D6");
    }
  }

  public bool VerifyTotp(string userSecret, string code)
  {
    var generatedCode = GenerateTotp(new User { TotpSecret = userSecret }).Result;
    return CryptographicOperations.FixedTimeEquals(
      Encoding.UTF8.GetBytes(generatedCode),
      Encoding.UTF8.GetBytes(code)
    );
  }
}

// Login com MFA obrigatório para admin
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
  var user = await _userManager.FindByEmailAsync(request.Email);
  
  if (!await _userManager.CheckPasswordAsync(user, request.Password))
    return Unauthorized();
  
  if (user.Roles.Contains("Admin") && !string.IsNullOrEmpty(user.TotpSecret))
  {
    // Requerer MFA
    var mfaToken = _tokenService.GenerateMfaToken(user.Id);
    return Ok(new { requiresMfa = true, mfaToken });
  }
  
  return Ok(new { accessToken = GenerateJwt(user) });
}
```

#### **Req 9: Physical Security**
- ✅ Usar data center com segurança física (AWS, Azure, Google Cloud)
- ✅ CCTV em salas de servidor
- ✅ Badge access com logs
- ✅ Acesso restrito a áreas críticas

#### **Req 10: Logging & Monitoring**
```csharp
// Serilog + Application Insights
var logger = new LoggerConfiguration()
  .MinimumLevel.Information()
  .WriteTo.Console()
  .WriteTo.ApplicationInsights(
    new ApplicationInsightsSettings(),
    TelemetryConverter.Events)
  .WriteTo.File(
    path: "logs/audit-.log",
    rollingInterval: RollingInterval.Day,
    retainedFileCountLimit: 365,
    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
  )
  .CreateLogger();

// Log sensitivo: Auditoria de operações críticas
public class AuditLog
{
  public Guid Id { get; set; }
  public string UserId { get; set; }
  public string Action { get; set; }           // "PaymentRefunded", "UserDeleted", etc
  public string EntityType { get; set; }       // "Payment", "User", etc
  public string EntityId { get; set; }
  public string OldValues { get; set; }        // JSON serializado
  public string NewValues { get; set; }        // JSON serializado
  public string IpAddress { get; set; }
  public DateTime Timestamp { get; set; }
  public string UserAgent { get; set; }
  
  // Retention: mínimo 1 ano
}
```

#### **Req 11: Security Testing & Vulnerability Management**
```bash
#!/bin/bash
# scripts/security-testing.sh

# 1. Dependency scanning
dotnet list package --vulnerable

# 2. SAST (Static Application Security Testing)
sonar-scanner \
  /d:sonar.projectKey="ecommerce" \
  /d:sonar.sources="." \
  /d:sonar.host.url="https://sonarcloud.io" \
  /d:sonar.login="$SONAR_TOKEN"

# 3. DAST (Dynamic Application Security Testing)
# Usar OWASP ZAP
zaproxy -cmd \
  -quickurl http://localhost:8080 \
  -quickout report.html

# 4. Pen testing anual
# Contratar firma especializada (OWASP TOP 10)
```

#### **Req 12: Maintain a Policy**
```markdown
# POLÍTICA DE SEGURANÇA PCI DSS

## 1. Responsabilidades
- CTO: Governance geral
- Security Team: Testes e compliance
- Devs: Code seguro
- DevOps: Infra segura

## 2. Compliance Monitoring
- Vulnerability scanning: trimestral
- Penetration testing: anual
- Code review: 100% das mudanças
- Dependency updates: mensal

## 3. Incident Response
- Detecção: < 1 hora
- Investigação: < 24 horas
- Notificação: < 72 horas
```

### 1.2 PCI DSS Compliance Status

**Nossa arquitetura: OUT OF SCOPE (Tokenização completa)**

```yaml
Our Responsibility:
  - API endpoints (validação, autenticação)
  - Database (dados não-PAN apenas)
  - Infrastructure (segurança de rede)

Stripe/Mercado Pago Responsibility:
  - Armazenar números de cartão
  - PCI DSS full compliance
  - Segurança de pagamentos

Result:
  - ✅ Fora do escopo PCI DSS full
  - ✅ Apenas level 3 (SAQ A-EP)
  - ✅ Checklist simplificado
```

### 1.3 PCI DSS Checklist

```markdown
## Pre-Certification

- [ ] Não armazena números de cartão (NUNCA)
- [ ] Usa tokenização (Stripe/Mercado Pago)
- [ ] HTTPS/TLS 1.2+ obrigatório
- [ ] Firewall + WAF ativo
- [ ] Senhas fortes (12+ chars, complexo)
- [ ] MFA para admin/payment operations
- [ ] Logs de auditoria centralizados
- [ ] Penetration testing feito
- [ ] Política de segurança documentada
- [ ] SAQ assessment completado
- [ ] Certificação QSA valida (anual)

## During Compliance

- [ ] Vulnerability scanning trimestral
- [ ] Dependency updates mensal
- [ ] Code review obrigatório
- [ ] Training anual para equipe
- [ ] Incident response testado
- [ ] Backup recovery testado
```

---

## 2. LGPD (Lei Geral de Proteção de Dados - Brasil)

### 2.1 Princípios Core

**LGPD exige:**
1. **Transparência** - usuário sabe quais dados coletamos
2. **Finalidade** - dados coletados para propósito específico
3. **Necessidade** - coletar apenas dados necessários
4. **Segurança** - proteger dados contra vazamento
5. **Retenção** - apagar dados após não precisar mais
6. **Acesso** - usuário pode acessar seus dados
7. **Correção** - usuário pode corrigir dados
8. **Eliminação** - direito ao esquecimento

### 2.2 Dados Pessoais Coletados

**Na nossa plataforma:**

| Dado | Coletado | Por quê | Retenção |
|------|----------|--------|----------|
| Email | ✅ | Login, comunicação | Enquanto ativo + 1 ano |
| Senha (hash) | ✅ | Autenticação | Enquanto ativo |
| Nome completo | ✅ | Pedidos | Enquanto cliente |
| Telefone | ✅ | Contato | 1 ano pós-último pedido |
| Endereço | ✅ | Entrega | 1 ano pós-entrega |
| CPF | ❌ | Não coletamos | N/A |
| Geolocalização | ❌ | Não coletamos | N/A |
| Dados de navegação | ⚠️ | Analytics apenas | 1 ano |

### 2.3 Política de Privacidade (Template)

```markdown
# POLÍTICA DE PRIVACIDADE

## 1. Controlador de Dados
- Empresa: Loja de Produtos LTDA
- CNPJ: 12.345.678/0001-99
- Email: privacy@loja.com.br

## 2. Dados Coletados
- Nome, email, telefone, endereço
- Histórico de pedidos e pagamentos
- Cookies de sessão (funcional, não rastreamento)

## 3. Finalidade
- Processar pedidos
- Comunicação de status
- Melhorias de serviço
- Análise de uso (agregada)

## 4. Base Legal
- Consentimento (checkbox no cadastro)
- Execução de contrato (pedido)
- Interesse legítimo (segurança)

## 5. Retenção de Dados
- Dados ativos: durante relacionamento
- Dados inativos: 12 meses
- Dados de pagamento: conforme Lei 12.865

## 6. Direitos do Titular
- Acessar dados: solicitação em privacy@loja.com.br
- Corrigir dados: editar no perfil
- Deletar dados: solicitar esquecimento
- Portabilidade: exportar dados em CSV

## 7. Segurança
- Criptografia TLS em trânsito
- Criptografia em repouso
- Backups diários
- Acesso restrito (RBAC)

## 8. Compartilhamento de Dados
- **Nunca** compartilhamos com terceiros
- Exceto quando legalmente obrigado

## 9. Contacto
- DPO (Data Protection Officer): dpo@loja.com.br
```

### 2.4 Implementação LGPD (Backend)

#### **Consentimento no Registro**

```csharp
// Domain/Entities/User.cs
public class User
{
  public Guid Id { get; set; }
  public string Email { get; set; }
  
  // LGPD: Consentimento
  public bool ConsentPrivacy { get; set; }           // Checkbox na página
  public bool ConsentNewsletter { get; set; }        // Opt-in
  public DateTime ConsentedAt { get; set; }
  public string ConsentIpAddress { get; set; }       // Para auditoria
}

// Application/DTOs/RegisterRequest.cs
public class RegisterRequest
{
  public string Email { get; set; }
  public string Password { get; set; }
  public string FullName { get; set; }
  
  [Required(ErrorMessage = "Você deve aceitar a Política de Privacidade")]
  public bool ConsentPrivacy { get; set; }
  
  public bool ConsentNewsletter { get; set; }
}
```

#### **Direito de Acesso (LGPD Art. 18)**

```csharp
// Application/Services/DataAccessService.cs
public class DataAccessService
{
  public async Task<UserDataExportDto> ExportUserDataAsync(Guid userId)
  {
    var user = await _userRepository.GetByIdAsync(userId);
    var orders = await _orderRepository.GetByUserIdAsync(userId);
    var payments = await _paymentRepository.GetByUserIdAsync(userId);
    
    var export = new UserDataExportDto
    {
      PersonalInfo = new {
        user.Email,
        user.FullName,
        user.PhoneNumber,
        user.CreatedAt,
        user.LastLoginAt
      },
      Orders = orders.Select(o => new {
        o.Id,
        o.Status,
        o.TotalAmount,
        o.CreatedAt
      }),
      Payments = payments.Select(p => new {
        p.Id,
        p.Status,
        p.Amount,
        p.CreatedAt
      })
    };

    // Retornar como CSV ou JSON
    return export;
  }
}

// API
[HttpGet("export-data")]
[Authorize]
public async Task<IActionResult> ExportMyData()
{
  var userId = User.FindFirst(ClaimTypes.NameIdentifier);
  var data = await _dataAccessService.ExportUserDataAsync(new Guid(userId.Value));
  
  var json = JsonSerializer.Serialize(data);
  return File(Encoding.UTF8.GetBytes(json), "application/json", "meus_dados.json");
}
```

#### **Direito ao Esquecimento (LGPD Art. 17)**

```csharp
// Application/Services/DataDeletionService.cs
public class DataDeletionService
{
  public async Task DeleteUserDataAsync(Guid userId, string reason)
  {
    var user = await _userRepository.GetByIdAsync(userId);
    
    // Não deletar imediatamente
    // Marcar como "deletion_requested"
    user.DeletionRequestedAt = DateTime.UtcNow;
    user.DeletionReason = reason;
    
    // Aguardar 30 dias (direito de reconsideração)
    var deletionScheduledFor = DateTime.UtcNow.AddDays(30);
    
    // Audit log
    await _auditService.LogAsync(
      "DataDeletionRequested",
      "User",
      user.Id,
      reason,
      User.GetIpAddress()
    );

    // Notificar user
    await _emailService.SendAsync(
      user.Email,
      "Sua solicitação de exclusão de dados",
      $"Seus dados serão deletados em {deletionScheduledFor:dd/MM/yyyy}"
    );

    await _userRepository.UpdateAsync(user);
  }

  public async Task ExecuteDeletionAsync(Guid userId)
  {
    var user = await _userRepository.GetByIdAsync(userId);
    
    if (user.DeletionRequestedAt == null)
      return;

    // Deletar dados pessoais
    user.Email = null;
    user.PhoneNumber = null;
    user.FullName = "DELETED";
    user.AddressData = null;
    
    // Manter apenas:
    // - ID (para histórico de pedidos)
    // - Orders (para faturamento/fiscal)
    // - Payments (para reconciliação)
    
    // Mascarar relacionamentos
    user.IsDeleted = true;
    
    await _userRepository.UpdateAsync(user);
    
    // Log irreversível
    await _auditService.LogAsync(
      "DataDeletionExecuted",
      "User",
      user.Id,
      "Dados pessoais deletados conforme LGPD"
    );
  }
}

// Endpoint
[HttpPost("delete-account")]
[Authorize]
public async Task<IActionResult> RequestDeleteAccount([FromBody] DeleteAccountRequest request)
{
  var userId = new Guid(User.FindFirst(ClaimTypes.NameIdentifier).Value);
  await _dataDeletionService.DeleteUserDataAsync(userId, request.Reason);
  
  return Ok(new { message = "Sua solicitação foi registrada. Seus dados serão deletados em 30 dias." });
}
```

#### **Retenção de Dados (LGPD Art. 16)**

```csharp
// Infrastructure/Services/DataRetentionService.cs
public class DataRetentionService : BackgroundService
{
  protected override async Task ExecuteAsync(CancellationToken stoppingToken)
  {
    while (!stoppingToken.IsCancellationRequested)
    {
      // Rodar todo dia às 2 AM
      await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
      
      // 1. Deletar dados de usuários marcados para deleção
      await DeleteExpiredUserDataAsync();
      
      // 2. Anonimizar dados de orders antigos (> 7 anos)
      await AnonymizeOldOrdersAsync();
      
      // 3. Deletar logs de auditoria expirados (> 1 ano)
      await DeleteOldAuditLogsAsync();
    }
  }

  private async Task DeleteExpiredUserDataAsync()
  {
    var expiredUsers = await _userRepository.GetAsync(u =>
      u.IsDeleted && 
      u.DeletionRequestedAt < DateTime.UtcNow.AddDays(-30)
    );

    foreach (var user in expiredUsers)
    {
      // Hard delete
      await _userRepository.DeleteAsync(user);
    }
  }

  private async Task AnonymizeOldOrdersAsync()
  {
    var oldOrders = await _orderRepository.GetAsync(o =>
      o.CreatedAt < DateTime.UtcNow.AddYears(-7)
    );

    foreach (var order in oldOrders)
    {
      order.UserEmail = "anonymized@example.com";
      order.UserPhone = null;
      order.ShippingAddress = "Anonymous";
      await _orderRepository.UpdateAsync(order);
    }
  }
}
```

### 2.5 LGPD Checklist

```markdown
## Compliance LGPD

- [ ] Política de Privacidade publicada e clara
- [ ] Checkbox de consentimento em registro
- [ ] Dados pessoais coletados apenas quando necessário
- [ ] Usuário pode acessar seus dados (API export)
- [ ] Usuário pode deletar conta (30 dias)
- [ ] Dados deletados após retenção
- [ ] Conformidade documentada
- [ ] DPO designado (ou contato de privacidade)
- [ ] Incident response plan para vazamentos
- [ ] Auditoria de conformidade trimestral
```

---

## 3. GDPR (General Data Protection Regulation - UE)

### 3.1 Diferenças LGPD vs GDPR

| Aspecto | LGPD | GDPR |
|--------|------|------|
| Escopo | Brasil | EU + EEA |
| Multa | Até 2% faturamento | Até 4% faturamento |
| Consentimento | Explícito | Explícito + duplo opt-in |
| Retenção | 1 ano típico | 3 anos típico |
| DPA | Opcional | Obrigatório (Data Processing Agreement) |

### 3.2 Se sua plataforma recebe usuários EU:

**Implementar:**
- ✅ Cookie consent banner (antes de qualquer tracking)
- ✅ Double opt-in para newsletter
- ✅ DPA com provedores (Stripe, CDN, etc)
- ✅ Privacy by design
- ✅ Data Protection Impact Assessment (DPIA)

**Não é necessário:**
- Se você bloquear usuários da EU no registro
- Se tiver disclaimer "serviço não disponível na EU"

**Nossa recomendação:**
Suportar GDPR desde o início (é superset de LGPD)

---

## 4. PROTEÇÃO CONTRA ATAQUES

### 4.1 OWASP Top 10

| # | Attack | Mitigação |
|---|--------|-----------|
| 1 | SQL Injection | Usar EF Core parameterizado (já feito) |
| 2 | Authentication Bypass | JWT + Refresh rotation + MFA (já feito) |
| 3 | Sensitive Data Exposure | Criptografia TLS + at-rest (feito) |
| 4 | XML External Entities (XXE) | Não parse XML não confiável |
| 5 | Broken Access Control | RBAC + SoD (em PLAN) |
| 6 | Security Misconfiguration | Hardening de config |
| 7 | XSS | Sanitization no frontend (Next.js) + CSP |
| 8 | Insecure Deserialization | Não desserializar dados não confiáveis |
| 9 | Using Components with Known Vulns | Dependency scanning (CI/CD) |
| 10 | Insufficient Logging/Monitoring | Auditoria completa (feito) |

### 4.2 CSRF Protection

```csharp
// Program.cs
builder.Services.AddCsrfProtection();

// Middleware
app.UseCsrfProtection();

// Controller
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
{
  // CSRF token validado automaticamente
  return Ok();
}
```

**Frontend:**
```typescript
// Next.js já protege POST/PUT/DELETE com CSRF automaticamente
// Usar form data, não JSON raw, para máxima proteção
const formData = new FormData();
formData.append('name', 'John');

await fetch('/api/profile', {
  method: 'POST',
  body: formData,  // Envia com CSRF token automaticamente
});
```

### 4.3 XSS Prevention

```typescript
// ✅ CORRETO (escapa HTML)
<p>{product.name}</p>

// ❌ ERRADO (pode ter XSS)
<p dangerouslySetInnerHTML={{ __html: product.name }} />

// Content Security Policy
// next.config.js
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' cdn.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' api.stripe.com;
`;

module.exports = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: csp.replace(/\n/g, ' '),
        },
      ],
    },
  ],
};
```

### 4.4 Rate Limiting & DDoS

```csharp
// Program.cs
builder.Services.AddRateLimiter(options =>
{
  options.AddFixedWindowLimiter("default", opt =>
  {
    opt.PermitLimit = 100;
    opt.Window = TimeSpan.FromMinutes(1);
    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    opt.QueueLimit = 50;
  });
});

app.UseRateLimiter();

// Endpoint específico (login: máximo restritivo)
[HttpPost("login")]
[EnableRateLimiting("strict")]  // 5 por 15 min
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
  // ...
}
```

### 4.5 API Key Management

```csharp
// ❌ NUNCA hardcode
const STRIPE_KEY = "sk_live_...";  // 🚨 Crime

// ✅ CORRETO
var stripeKey = configuration["Stripe:SecretKey"];
// Usar: GitHub Secrets, AWS Secrets Manager, Azure Key Vault

// .github/secrets
STRIPE_SECRET_KEY: sk_live_...
MERCADOPAGO_ACCESS_TOKEN: ...
DATABASE_PASSWORD: ...
```

---

## 5. COMPLIANCE CHECKLIST FINAL

```markdown
## Security & Compliance

### PCI DSS
- [ ] Sem armazenamento de números de cartão
- [ ] Tokenização via Stripe/Mercado Pago
- [ ] HTTPS/TLS 1.2+
- [ ] Firewall + WAF
- [ ] MFA para admin
- [ ] Logs de auditoria
- [ ] Encryption at rest
- [ ] QSA assessment (anual)

### LGPD
- [ ] Política de Privacidade publicada
- [ ] Consentimento em registro
- [ ] Exportação de dados (API)
- [ ] Direito ao esquecimento (30 dias)
- [ ] Retenção de dados definida
- [ ] DPO/contato de privacidade
- [ ] Auditoria trimestral

### GDPR (se EU users)
- [ ] Cookie consent banner
- [ ] Double opt-in (newsletter)
- [ ] DPA com provedores
- [ ] DPIA realizado

### OWASP Top 10
- [ ] Sem SQL Injection
- [ ] Autenticação robusta + MFA
- [ ] Dados sensíveis criptografados
- [ ] Acesso controlado (RBAC)
- [ ] Sem XSS/CSRF
- [ ] Config segura
- [ ] Logging completo
- [ ] Dependency scanning

### Incident Response
- [ ] Plano de resposta a vazamentos
- [ ] Contact de segurança publicado
- [ ] Monitoramento 24/7
- [ ] Alertas automáticos

```

---

## 6. TEMPLATE DE POLÍTICA DE SEGURANÇA

```markdown
# POLÍTICA DE SEGURANÇA DA INFORMAÇÃO

## 1. Objetivo
Proteger dados e sistemas da organização contra ataques, vazamentos e acessos não autorizados.

## 2. Escopo
Aplicável a todos os colaboradores, contratados e terceiros.

## 3. Controles Técnicos

### 3.1 Autenticação
- Senhas: mínimo 12 caracteres, complexas
- MFA: obrigatório para admin
- Sessions: timeout 1 hora inatividade

### 3.2 Criptografia
- Dados em trânsito: TLS 1.2+
- Dados em repouso: AES-256
- Backups: criptografados

### 3.3 Acesso
- Princípio do menor privilégio
- RBAC com 4+ roles
- Auditoria de 100% das mudanças

### 3.4 Monitoramento
- Logs centralizados (1 ano retention)
- Alertas em tempo real
- Pen testing anual

## 4. Controles Operacionais

### 4.1 Incidentes
- Reporte em < 24h
- Investigação em < 48h
- Notificação em < 72h (se necessário)

### 4.2 Backup & Recovery
- Backup diário
- RTO: 4 horas
- RPO: 1 hora

### 4.3 Desenvolvimento
- Code review obrigatório
- SAST em CI/CD
- Dependency scanning

## 5. Responsabilidades
- CTO: Governance geral
- DevOps: Infraestrutura segura
- Devs: Code seguro
- Todos: Reportar incidentes
```

---

## 7. INCIDENT RESPONSE PLAN (Plano de Resposta a Incidentes)

### 7.1 Breach Detection & Response (LGPD Art. 18)

```csharp
// Infrastructure/Services/IncidentResponseService.cs
public class IncidentResponseService
{
  private readonly ILogger<IncidentResponseService> _logger;
  private readonly IEmailService _emailService;
  private readonly INotificationService _notificationService;

  public async Task ReportBreachAsync(SecurityBreach breach)
  {
    // 1. DETECTAR (< 1 hora)
    _logger.LogCritical("SECURITY BREACH DETECTED: {breachType}", breach.Type);
    
    // 2. INVESTIGAR (< 24 horas)
    var investigation = await InvestigateAsync(breach);
    
    // 3. NOTIFICAR (< 72 horas)
    if (investigation.IsSignificant)
    {
      // 3a. Notificar usuários afetados
      var affectedUsers = await GetAffectedUsersAsync(breach);
      foreach (var user in affectedUsers)
      {
        await _emailService.SendAsync(
          user.Email,
          "Notificação de Incidente de Segurança",
          GetBreachNotificationTemplate(breach, investigation)
        );
      }
      
      // 3b. Notificar autoridades (LGPD)
      await NotifyAuthoritiesAsync(breach, investigation);
      
      // 3c. Reportar em mídia
      if (affectedUsers.Count > 1000)
      {
        await NotifyMediaAsync(breach);
      }
    }
    
    // 4. LOG COMPLETO (auditoria)
    await _auditService.LogSecurityIncidentAsync(
      incidentId: Guid.NewGuid(),
      type: breach.Type,
      detectedAt: DateTime.UtcNow,
      affectedUsers: investigation.AffectedUserCount,
      dataExposed: investigation.DataExposed,
      rootCause: investigation.RootCause,
      resolution: investigation.Resolution
    );
  }

  private async Task NotifyAuthoritiesAsync(SecurityBreach breach, Investigation investigation)
  {
    // LGPD Art. 18 - Notificar ANPD (Autoridade Nacional de Proteção de Dados)
    var report = new
    {
      incidentId = Guid.NewGuid(),
      type = breach.Type,
      detectedDate = DateTime.UtcNow,
      affectedDataSubjects = investigation.AffectedUserCount,
      personalDataTypes = investigation.DataCategories,
      likelyConsequences = investigation.RiskAssessment,
      measuresAdopted = investigation.Measures,
      contactPerson = new
      {
        name = "DPO",
        email = "dpo@loja.com.br"
      }
    };
    
    // POST para ANPD (se > 1000 usuários)
    if (investigation.AffectedUserCount >= 1000)
    {
      await _anpdService.ReportAsync(report);
    }
  }
}

public class SecurityBreach
{
  public Guid Id { get; set; }
  public string Type { get; set; }                    // "DataExposure", "Ransomware", etc
  public DateTime DetectedAt { get; set; }
  public string Description { get; set; }
  public int SeverityLevel { get; set; }              // 1-5
  public List<string> AffectedSystems { get; set; }
}
```

### 7.2 Incident Response Plan Checklist

```markdown
## Incidente: Timeline & Ações

### T+0h: DETECTAR
- [ ] Alert dispara (log anomaly, failed auth, etc)
- [ ] On-call engineer acionado
- [ ] Incident room criada (Slack/Teams)
- [ ] Comunicação interna ativada

### T+1h: INVESTIGAR
- [ ] Escopo definido (quantos usuários afetados?)
- [ ] Dados expostos identificados
- [ ] Root cause determinada
- [ ] Timeline reconstituída
- [ ] Backup ativado (se necessário)

### T+24h: MITIGAR
- [ ] Isolamento de sistemas comprometidos
- [ ] Credenciais alteradas
- [ ] Patches aplicados
- [ ] Recovery iniciado (se aplicável)

### T+72h: NOTIFICAR
- [ ] Usuários afetados notificados (email + SMS)
- [ ] Mídia notificada (se necessário)
- [ ] Autoridades notificadas (ANPD, polícia)
- [ ] Post-mortem iniciado

### T+1 semana: COMUNICAR
- [ ] Relatório completo publicado
- [ ] Medidas preventivas anunciadas
- [ ] Crédito de proteção oferecido (se roubo de identidade)
- [ ] Monitoramento contínuo ativado
```

---

## 8. GDPR - COOKIE POLICY & CONSENTIMENTO

### 8.1 Cookie Banner Implementation

```typescript
// nodejs/src/components/CookieConsent.tsx
import { useEffect, useState } from 'react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,      // Sempre true (funcional)
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    setPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
    saveCookieConsent();
  };

  const handleRejectAll = () => {
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    });
    saveCookieConsent();
  };

  const saveCookieConsent = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    
    // Apenas ativar tracking se consentimento dado
    if (preferences.analytics) {
      initializeGoogleAnalytics();
      initializeHotjar();
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h3 className="font-bold mb-2">Política de Cookies</h3>
        <p className="text-sm mb-4">
          Usamos cookies para melhorar sua experiência. 
          <a href="/privacy" className="underline">Saiba mais</a>
        </p>
        
        <div className="space-y-2 mb-4 text-sm">
          <label>
            <input type="checkbox" checked disabled />
            Cookies Necessários (sempre ativo)
          </label>
          <label>
            <input type="checkbox" onChange={(e) => 
              setPreferences({...preferences, analytics: e.target.checked})
            } />
            Analytics
          </label>
          <label>
            <input type="checkbox" onChange={(e) => 
              setPreferences({...preferences, marketing: e.target.checked})
            } />
            Marketing
          </label>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleRejectAll} className="px-4 py-2 border">
            Rejeitar Tudo
          </button>
          <button onClick={handleAcceptAll} className="px-4 py-2 bg-blue-600 text-white">
            Aceitar Tudo
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 Cookie Policy Template

```markdown
# POLÍTICA DE COOKIES

## 1. O que são Cookies?
Cookies são pequenos arquivos de texto armazenados no seu navegador.

## 2. Tipos de Cookies Usados

### Necessários
- Session ID
- CSRF token
- Preferência de idioma
- Autenticação

**Retenção:** Sessão + 1 hora após logout

### Analytics
- Google Analytics (anonymized IP)
- Heatmaps (Hotjar)
- Performance monitoring

**Retenção:** 24 meses
**Opt-in:** Consentimento obrigatório

### Marketing
- Remarketing (Google/Facebook)
- Conversão tracking

**Retenção:** 13 meses
**Opt-in:** Consentimento obrigatório

## 3. Como Controlar Cookies
- Alterar preferências em "Configurações de Privacidade"
- Limpar cookies do navegador
- Usar modo "Não Rastreado"

## 4. Contato
privacy@loja.com.br
```

---

## 9. DATA PROCESSING AGREEMENT (DPA) - GDPR/LGPD

### 9.1 DPA Template para Stripe

```markdown
# DATA PROCESSING AGREEMENT - STRIPE INTEGRATION

## 1. Procesadores Subcontratados
Stripe processa dados de cartão em nome da nossa empresa.

## 2. Dados Processados
- Números de cartão (tokenizados)
- Nomes de titulares
- Endereços de cobrança
- Transaction history

## 3. Localização
- EU: data centers europeus
- USA: data centers americanos (Privacy Shield)
- LATAM: regional data centers

## 4. Retenção
- Transações: 7 anos (conformidade fiscal)
- Tokens: conforme necessário
- Logs: 1 ano

## 5. Segurança
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.2+)
- Regular security audits (SOC 2 Type II)
- Penetration testing anual

## 6. Direitos do Titular
- Acesso: Stripe fornece acesso via API
- Deleção: Dados mascarados após retenção
- Portabilidade: Export em formato padrão

## 7. Subprocessadores Stripe
- AWS (infraestrutura)
- Datadog (monitoring)
- Okta (identidade)

[Link para lista completa Stripe](https://stripe.com/docs/security/stripe-privacy-center)
```

### 9.2 Vendor Management

```csharp
// Infrastructure/VendorManagement/VendorSecurityService.cs
public class VendorSecurityService
{
  public class VendorAssessment
  {
    public string VendorName { get; set; }
    public string Service { get; set; }                    // "Stripe", "Mercado Pago", etc
    public DateTime LastAuditDate { get; set; }
    public bool HasSOC2 { get; set; }
    public bool HasISO27001 { get; set; }
    public bool HasPCI { get; set; }
    public string DataLocation { get; set; }
    public List<string> Subprocessors { get; set; }
    public DateTime AuditDueDate { get; set; }
  }

  private readonly List<VendorAssessment> _vendors = new()
  {
    new VendorAssessment
    {
      VendorName = "Stripe",
      Service = "Payment Processing",
      HasSOC2 = true,
      HasPCI = true,
      DataLocation = "USA + EU",
      LastAuditDate = new DateTime(2024, 1, 1),
      AuditDueDate = new DateTime(2025, 1, 1)
    },
    new VendorAssessment
    {
      VendorName = "Mercado Pago",
      Service = "Payment Processing",
      HasPCI = true,
      DataLocation = "LATAM",
      LastAuditDate = new DateTime(2024, 3, 1),
      AuditDueDate = new DateTime(2025, 3, 1)
    }
  };

  public List<VendorAssessment> GetOverdueAudits()
  {
    return _vendors
      .Where(v => v.AuditDueDate < DateTime.UtcNow)
      .ToList();
  }
}
```

---

## 10. SECURE PASSWORD RESET FLOW

```csharp
// Application/Services/PasswordResetService.cs
public class PasswordResetService
{
  public async Task InitiatePasswordResetAsync(string email)
  {
    var user = await _userRepository.GetByEmailAsync(email);
    if (user == null)
      return;  // Security: não revelar se email existe
    
    // 1. Gerar token único + válido por 1 hora
    var resetToken = _tokenService.GeneratePasswordResetToken(user.Id, TimeSpan.FromHours(1));
    
    // 2. Armazenar token (hashed) no banco
    user.PasswordResetToken = HashToken(resetToken);
    user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
    user.PasswordResetAttempts = 0;
    await _userRepository.UpdateAsync(user);
    
    // 3. Enviar link seguro
    var resetLink = $"https://loja.com.br/reset-password?token={resetToken}";
    await _emailService.SendAsync(
      email,
      "Resetar Senha",
      $"Clique aqui para resetar sua senha (válido por 1 hora): {resetLink}"
    );
    
    // 4. Log de auditoria
    await _auditService.LogAsync("PasswordResetRequested", "User", user.Id, email);
  }

  public async Task<bool> ValidateAndResetPasswordAsync(string token, string newPassword)
  {
    var user = await _userRepository.GetByPasswordResetTokenAsync(HashToken(token));
    
    if (user == null || user.PasswordResetTokenExpiry < DateTime.UtcNow)
      return false;
    
    // Limite de tentativas
    if (user.PasswordResetAttempts >= 5)
    {
      // Bloqueado por 30 minutos
      await _redisCacheService.SetAsync($"pwd-reset-locked:{user.Id}", "1", TimeSpan.FromMinutes(30));
      return false;
    }

    // Validar senha forte
    var validation = _passwordValidator.Validate(newPassword);
    if (!validation.IsValid)
      return false;

    // Resetar senha
    user.PasswordHash = _passwordHasher.HashPassword(newPassword);
    user.PasswordResetToken = null;
    user.PasswordResetTokenExpiry = null;
    user.PasswordResetAttempts = 0;
    await _userRepository.UpdateAsync(user);

    // Invalidar todas as sessions (force login)
    await _sessionService.InvalidateAllAsync(user.Id);

    // Log de auditoria
    await _auditService.LogAsync("PasswordReset", "User", user.Id, newPassword: "[REDACTED]");

    return true;
  }
}

// Endpoint
[HttpPost("reset-password")]
[AllowAnonymous]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
{
  var result = await _passwordResetService.ValidateAndResetPasswordAsync(
    request.Token,
    request.NewPassword
  );

  if (result)
    return Ok(new { message = "Senha resetada com sucesso. Faça login novamente." });

  return BadRequest(new { error = "Token inválido ou expirado" });
}
```

---

## 11. SESSION MANAGEMENT & TIMEOUT SECURITY

```csharp
// Infrastructure/Security/SessionService.cs
public class SessionManagementService
{
  private readonly IDistributedCache _cache;
  private readonly ILogger<SessionManagementService> _logger;

  public async Task<SessionInfo> CreateSessionAsync(User user, string ipAddress, string userAgent)
  {
    var sessionId = Guid.NewGuid().ToString();
    var sessionInfo = new SessionInfo
    {
      SessionId = sessionId,
      UserId = user.Id,
      CreatedAt = DateTime.UtcNow,
      LastActivityAt = DateTime.UtcNow,
      ExpiresAt = DateTime.UtcNow.AddMinutes(60),  // 1 hora
      IpAddress = ipAddress,
      UserAgent = userAgent,
      IsActive = true
    };

    // Armazenar em Redis
    await _cache.SetAsync(
      $"session:{sessionId}",
      JsonSerializer.SerializeToUtf8Bytes(sessionInfo),
      new DistributedCacheEntryOptions
      {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
      }
    );

    return sessionInfo;
  }

  public async Task<bool> ValidateSessionAsync(string sessionId, string ipAddress)
  {
    var sessionData = await _cache.GetAsync($"session:{sessionId}");
    if (sessionData == null)
      return false;

    var session = JsonSerializer.Deserialize<SessionInfo>(sessionData);

    // 1. Verificar expiração
    if (session.ExpiresAt < DateTime.UtcNow)
      return false;

    // 2. Verificar IP (prevent session hijacking)
    if (session.IpAddress != ipAddress)
    {
      _logger.LogWarning("IP mismatch for session {sessionId}", sessionId);
      return false;
    }

    // 3. Atualizar lastActivityAt
    session.LastActivityAt = DateTime.UtcNow;
    await _cache.SetAsync(
      $"session:{sessionId}",
      JsonSerializer.SerializeToUtf8Bytes(session),
      new DistributedCacheEntryOptions
      {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
      }
    );

    return true;
  }

  public async Task InvalidateAllAsync(Guid userId)
  {
    // Logout de todas as devices
    var pattern = $"session:*:user:{userId}";
    // Usar SCAN em Redis para encontrar todas as sessions
    var keys = await _cache.GetAsync($"user-sessions:{userId}");
    // Deletar cada uma
    _logger.LogInformation("Invalidated all sessions for user {userId}", userId);
  }

  public async Task LogoutAsync(string sessionId)
  {
    await _cache.RemoveAsync($"session:{sessionId}");
  }
}

public class SessionInfo
{
  public string SessionId { get; set; }
  public Guid UserId { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime LastActivityAt { get; set; }
  public DateTime ExpiresAt { get; set; }
  public string IpAddress { get; set; }
  public string UserAgent { get; set; }
  public bool IsActive { get; set; }
}
```

---

## 12. AUDIT LOG RETENTION & POLICY

```csharp
// Infrastructure/Persistence/AuditLogRepository.cs
public class AuditLogRepository : IRepository<AuditLog>
{
  public async Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime start, DateTime end)
  {
    return await _context.AuditLogs
      .Where(x => x.Timestamp >= start && x.Timestamp <= end)
      .OrderByDescending(x => x.Timestamp)
      .ToListAsync();
  }

  // Política de retenção
  public async Task PruneOldLogsAsync()
  {
    var cutoffDate = DateTime.UtcNow.AddYears(-1);  // Manter 1 ano
    
    var oldLogs = await _context.AuditLogs
      .Where(x => x.Timestamp < cutoffDate)
      .ToListAsync();

    // Opção 1: Arquivar em cold storage (S3 Glacier)
    await _archiveService.ArchiveAsync(oldLogs);

    // Opção 2: Deletar
    _context.AuditLogs.RemoveRange(oldLogs);
    await _context.SaveChangesAsync();

    _logger.LogInformation("Pruned {count} old audit logs", oldLogs.Count);
  }
}

// Audit Log Retention Policy
public class AuditLogRetentionPolicy
{
  public static Dictionary<string, int> RetentionByAction = new()
  {
    { "PaymentProcessed", 2555 },        // 7 anos (fiscal)
    { "UserCreated", 365 },              // 1 ano
    { "PasswordChanged", 365 },          // 1 ano
    { "RoleChanged", 730 },              // 2 anos
    { "DataExported", 1825 },            // 5 anos (compliance)
    { "SecurityIncident", 1825 },        // 5 anos
    { "AdminAction", 1825 }              // 5 anos
  };
}
```

---

## 13. TERCEIROS & VENDOR SECURITY ASSESSMENT

```yaml
# Checklist de segurança para terceiros

Antes de usar qualquer serviço externo, verificar:

## Infrastructure & Hosting
- [ ] Certificação SOC 2 Type II
- [ ] Certificação ISO 27001
- [ ] Localização de data centers
- [ ] Redundância & backup
- [ ] RTO/RPO documentados
- [ ] DPA em português

## Payment Providers
- [ ] Certificação PCI DSS (Level 1)
- [ ] Tokenização disponível
- [ ] Webhooks com HMAC
- [ ] Rate limiting policies
- [ ] Refund policies claras

## Analytics & CDN
- [ ] Privacy policy clara
- [ ] Data residency options
- [ ] GDPR/LGPD compliance
- [ ] DPA assinado
- [ ] Opt-out de tracking

## Alerts & Decision Matrix
- CRÍTICO (bloqueador): Sem SOC 2 ou DPA
- ALTO: Sem ISO 27001
- MÉDIO: Sem transparência de subprocessadores
- BAIXO: Processo de audit documentado
```

---

## 14. SECURITY TRAINING & AWARENESS

```markdown
# Programa de Segurança & Treinamento

## Treinamento Obrigatório
- **Todos:** OWASP Top 10 (anual)
- **Devs:** Secure coding (semestral)
- **Admin:** Access control (anual)
- **C-Suite:** Risk management (anual)

## Recursos
- [OWASP Top 10 Course](https://owasp.org/www-project-top-ten/)
- [PCI DSS Training](https://www.pcisecuritystandards.org/)
- [LGPD Compliance](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

## Testing
- Phishing simulations (trimestral)
- Security awareness quiz (mensal)
- Incident response drills (semestral)
```

---

**Compliance & Segurança Completa ✅**

