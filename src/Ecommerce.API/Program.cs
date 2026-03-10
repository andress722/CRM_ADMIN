using Microsoft.EntityFrameworkCore;
using Serilog;
using OpenTelemetry;
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;
using Ecommerce.Infrastructure.Data;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.API.Services;
using Ecommerce.API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Diagnostics;
using AspNetCoreRateLimit;
using Ecommerce.Infrastructure.Email;
using Ecommerce.Infrastructure.Payments;
using Microsoft.AspNetCore.HttpOverrides;
using Polly;
using Polly.Extensions.Http;
using Sentry;
using Npgsql;
using System.Net;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog early
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

var sentryDsn = builder.Configuration["Sentry:Dsn"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = builder.Environment.EnvironmentName;
        options.TracesSampleRate = builder.Configuration.GetValue("Sentry:TracesSampleRate", 0.0);
        options.SendDefaultPii = builder.Configuration.GetValue("Sentry:SendDefaultPii", false);
        options.Debug = false;
    });
}

// Add CORS
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
corsOrigins = corsOrigins?.Where(origin => !string.IsNullOrWhiteSpace(origin)).ToArray();
var corsOriginPatterns = builder.Configuration.GetSection("Cors:AllowedOriginPatterns").Get<string[]>();
corsOriginPatterns = corsOriginPatterns?.Where(pattern => !string.IsNullOrWhiteSpace(pattern)).ToArray() ?? Array.Empty<string>();
if (corsOrigins == null || corsOrigins.Length == 0)
{
    corsOrigins = new[]
    {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    };
}
var normalizedCorsOrigins = new HashSet<string>(
    corsOrigins.Select(origin => origin.TrimEnd('/')),
    StringComparer.OrdinalIgnoreCase);

bool IsOriginAllowed(string origin)
{
    if (string.IsNullOrWhiteSpace(origin))
    {
        return false;
    }

    var normalizedOrigin = origin.TrimEnd('/');
    if (normalizedCorsOrigins.Contains(normalizedOrigin))
    {
        return true;
    }

    if (!Uri.TryCreate(normalizedOrigin, UriKind.Absolute, out var originUri))
    {
        return false;
    }

    foreach (var pattern in corsOriginPatterns)
    {
        if (IsOriginPatternMatch(originUri, pattern))
        {
            return true;
        }
    }

    return false;
}

bool IsOriginPatternMatch(Uri originUri, string pattern)
{
    if (string.IsNullOrWhiteSpace(pattern))
    {
        return false;
    }

    if (!Uri.TryCreate(pattern.Replace("*.", "wildcard."), UriKind.Absolute, out var patternUri))
    {
        return false;
    }

    if (!string.Equals(originUri.Scheme, patternUri.Scheme, StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    if (!patternUri.IsDefaultPort && originUri.Port != patternUri.Port)
    {
        return false;
    }

    var patternHost = patternUri.Host;
    if (patternHost.StartsWith("wildcard.", StringComparison.OrdinalIgnoreCase))
    {
        var suffix = patternHost["wildcard.".Length..];
        return originUri.Host.Length > suffix.Length &&
               originUri.Host.EndsWith($".{suffix}", StringComparison.OrdinalIgnoreCase);
    }

    return string.Equals(originUri.Host, patternHost, StringComparison.OrdinalIgnoreCase);
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (corsOrigins.Length == 1 && corsOrigins[0] == "*")
        {
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
            return;
        }

        policy
            .SetIsOriginAllowed(IsOriginAllowed)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("MercadoPago", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
    })
    .AddPolicyHandler(GetMercadoPagoRetryPolicy())
    .AddPolicyHandler(GetMercadoPagoCircuitBreakerPolicy());
builder.Services.AddHttpClient("Correios", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
    });
builder.Services.AddSingleton<MetricsRegistry>();

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "E-Commerce API",
        Version = "v1.0.0",
        Description = "Sistema de E-Commerce com autenticação, pagamentos e gerenciamento de pedidos",
        Contact = new OpenApiContact
        {
            Name = "Suporte",
            Email = "suporte@ecommerce.com"
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Informe o token JWT no formato: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Use full type names for schema Ids to avoid collisions when there
    // are multiple nested/short-named request types with the same simple name.
    c.CustomSchemaIds(type => (type.FullName ?? type.Name).Replace('+', '.'));
});

static bool IsLocalPostgresConnection(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return false;
    }

    return connectionString.Contains("Host=localhost", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Host=127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Host=postgres", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Host=db", StringComparison.OrdinalIgnoreCase)
        || connectionString.Contains("Port=5433", StringComparison.OrdinalIgnoreCase);
}

static string NormalizePostgresConnectionString(string connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    if (Uri.TryCreate(connectionString, UriKind.Absolute, out var uri)
        && (uri.Scheme.Equals("postgres", StringComparison.OrdinalIgnoreCase)
            || uri.Scheme.Equals("postgresql", StringComparison.OrdinalIgnoreCase)))
    {
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port
        };

        var dbName = uri.AbsolutePath.Trim('/');
        if (!string.IsNullOrWhiteSpace(dbName))
        {
            builder.Database = dbName;
        }

        if (!string.IsNullOrWhiteSpace(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            if (parts.Length >= 1)
            {
                builder.Username = Uri.UnescapeDataString(parts[0]);
            }

            if (parts.Length == 2)
            {
                builder.Password = Uri.UnescapeDataString(parts[1]);
            }
        }

        var query = uri.Query.TrimStart('?');
        if (!string.IsNullOrWhiteSpace(query))
        {
            foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var split = pair.Split('=', 2);
                var key = Uri.UnescapeDataString(split[0]).Trim().ToLowerInvariant();
                var value = split.Length == 2 ? Uri.UnescapeDataString(split[1]).Trim() : string.Empty;

                switch (key)
                {
                    case "sslmode":
                        if (Enum.TryParse<SslMode>(value, true, out var sslMode))
                        {
                            builder.SslMode = sslMode;
                        }
                        break;
                    case "ssl":
                    case "sslmode=require":
                        builder.SslMode = SslMode.Require;
                        break;
                }
            }
        }

        return builder.ConnectionString;
    }

    // Already in ADO.NET key/value format.
    if (connectionString.Contains('='))
    {
        return connectionString;
    }

    return connectionString;
}

static ForwardedHeadersOptions? BuildForwardedHeadersOptions(IConfiguration configuration, bool isDevelopment)
{
    var enableForwardedHeaders = configuration.GetValue("Networking:EnableForwardedHeaders", !isDevelopment);
    if (!enableForwardedHeaders)
    {
        return null;
    }

    var options = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost,
        RequireHeaderSymmetry = false,
        ForwardLimit = 2
    };

    var trustedProxies = configuration.GetSection("Networking:TrustedProxies").Get<string[]>()
        ?.Where(ip => !string.IsNullOrWhiteSpace(ip))
        .ToArray()
        ?? Array.Empty<string>();

    foreach (var proxy in trustedProxies)
    {
        if (IPAddress.TryParse(proxy, out var ipAddress))
        {
            options.KnownProxies.Add(ipAddress);
        }
        else
        {
            Log.Warning("Ignoring invalid trusted proxy IP configured in Networking:TrustedProxies: {Proxy}", proxy);
        }
    }

    var trustAllForwardedHeaders = configuration.GetValue("Networking:TrustAllForwardedHeaders", false);
    if (trustAllForwardedHeaders && options.KnownProxies.Count == 0)
    {
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
        Log.Warning("Networking:TrustAllForwardedHeaders=true is enabled. Accepting forwarded headers from any proxy.");
    }
    else if (!isDevelopment && options.KnownProxies.Count == 0)
    {
        Log.Warning("Forwarded headers enabled without trusted proxies configured. Set Networking:TrustedProxies or Networking:TrustAllForwardedHeaders=true for proxy environments.");
    }

    return options;
}
// Add DbContext - use PostgreSQL by default
builder.Services.AddDbContext<EcommerceDbContext>(options =>
{
    var useInMemory = builder.Configuration.GetValue("Database:UseInMemory", false);
    if (useInMemory)
    {
        options.UseInMemoryDatabase("EcommerceDb");
    }
    else
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        var renderDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

        if ((string.IsNullOrWhiteSpace(connectionString) || IsLocalPostgresConnection(connectionString))
            && !string.IsNullOrWhiteSpace(renderDatabaseUrl))
        {
            connectionString = renderDatabaseUrl;
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string not configured. Set ConnectionStrings__DefaultConnection or DATABASE_URL.");
        }

        if (builder.Environment.IsProduction() && IsLocalPostgresConnection(connectionString))
        {
            Log.Warning(
                "Production is using a local Postgres connection string. Configure ConnectionStrings__DefaultConnection or DATABASE_URL for managed DB.");
        }

        connectionString = NormalizePostgresConnectionString(connectionString);
        options.UseNpgsql(connectionString);
    }
});

// Add Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserAddressRepository, UserAddressRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
builder.Services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
builder.Services.AddScoped<IEmailLogRepository, EmailLogRepository>();
builder.Services.AddScoped<IWebhookRepository, WebhookRepository>();
builder.Services.AddScoped<IWebhookDeliveryRepository, WebhookDeliveryRepository>();
builder.Services.AddScoped<IAnalyticsEventRepository, AnalyticsEventRepository>();
builder.Services.AddScoped<IDailyKpiRepository, DailyKpiRepository>();
builder.Services.AddScoped<ITwoFactorProfileRepository, TwoFactorProfileRepository>();
builder.Services.AddScoped<ITwoFactorSessionRepository, TwoFactorSessionRepository>();
builder.Services.AddScoped<ITwoFactorChallengeRepository, TwoFactorChallengeRepository>();
builder.Services.AddScoped<IRefundRepository, RefundRepository>();
builder.Services.AddScoped<IChargebackDisputeRepository, ChargebackDisputeRepository>();
builder.Services.AddScoped<IInventoryItemRepository, InventoryItemRepository>();
builder.Services.AddScoped<IInventoryMovementRepository, InventoryMovementRepository>();
builder.Services.AddScoped<IInventoryTransferRepository, InventoryTransferRepository>();
builder.Services.AddScoped<IProductVariantRepository, ProductVariantRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IReviewVoteRepository, ReviewVoteRepository>();
builder.Services.AddScoped<IWishlistRepository, WishlistRepository>();
builder.Services.AddScoped<IWishlistItemRepository, WishlistItemRepository>();
builder.Services.AddScoped<IShipmentRepository, ShipmentRepository>();
builder.Services.AddScoped<IShipmentTrackingEventRepository, ShipmentTrackingEventRepository>();
builder.Services.AddScoped<ISupportTicketRepository, SupportTicketRepository>();
builder.Services.AddScoped<ICouponRepository, CouponRepository>();
builder.Services.AddScoped<IBannerRepository, BannerRepository>();
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
builder.Services.AddScoped<IAffiliateRepository, AffiliateRepository>();
builder.Services.AddScoped<IExternalIdentityRepository, ExternalIdentityRepository>();
builder.Services.AddScoped<IPushDeviceRepository, PushDeviceRepository>();
builder.Services.AddScoped<ICrmLeadRepository, CrmLeadRepository>();
builder.Services.AddScoped<ICrmDealRepository, CrmDealRepository>();
builder.Services.AddScoped<ICrmContactRepository, CrmContactRepository>();
builder.Services.AddScoped<ICrmActivityRepository, CrmActivityRepository>();

// Add Services
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<UserAddressService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<WebhookService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<TwoFactorService>();
builder.Services.AddScoped<RefundService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<ProductVariantService>();
builder.Services.AddScoped<ReviewService>();
builder.Services.AddScoped<WishlistService>();
builder.Services.AddScoped<ShippingService>();
builder.Services.AddScoped<SupportService>();
builder.Services.AddScoped<SubscriptionService>();
builder.Services.AddScoped<AffiliateService>();
builder.Services.AddScoped<SocialAuthService>();
builder.Services.AddScoped<PushDeviceService>();
builder.Services.AddScoped<CrmService>();
builder.Services.AddScoped<AdminReportService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IIdempotencyService, IdempotencyService>();
builder.Services.AddScoped<LoyaltyService>();
builder.Services.AddScoped<DataGovernanceService>();
builder.Services.AddSingleton<IRequestThrottleService, InMemoryRequestThrottleService>();
builder.Services.AddHttpClient<ICaptchaVerifier, CaptchaVerifier>();
builder.Services.AddScoped<IShippingProvider, Ecommerce.Infrastructure.Shipping.CorreiosShippingProvider>();
var failFastMissingProviders = builder.Configuration.GetValue("Integrations:FailFastOnMissingProviders", false);
var paymentProvider = builder.Configuration.GetValue<string>("Payments:Provider");
var allowStubOutsideDevelopment = builder.Configuration.GetValue("Payments:AllowStubOutsideDevelopment", false);
if (string.IsNullOrWhiteSpace(paymentProvider))
{
    paymentProvider = builder.Environment.IsProduction() ? "MercadoPago" : "Stub";
    Log.Warning("Payments:Provider not configured. Defaulting to {Provider} in {Environment}.", paymentProvider, builder.Environment.EnvironmentName);
}

if (builder.Environment.IsProduction() &&
    !paymentProvider.Equals("MercadoPago", StringComparison.OrdinalIgnoreCase))
{
    Log.Warning("Payments:Provider set to {Provider} in production. Forcing MercadoPago.", paymentProvider);
    paymentProvider = "MercadoPago";
}

if (!builder.Environment.IsDevelopment() &&
    paymentProvider.Equals("Stub", StringComparison.OrdinalIgnoreCase) &&
    !allowStubOutsideDevelopment)
{
    throw new InvalidOperationException("Payments:Provider=Stub is blocked outside Development. Set Payments:AllowStubOutsideDevelopment=true to override.");
}

if (paymentProvider.Equals("MercadoPago", StringComparison.OrdinalIgnoreCase))
{
    var mercadoPagoAccessToken = builder.Configuration["Payments:MercadoPago:AccessToken"];
    if (string.IsNullOrWhiteSpace(mercadoPagoAccessToken))
    {
        var message = "Payments:MercadoPago:AccessToken is missing. Real payments cannot be processed.";
        if (builder.Environment.IsProduction() || failFastMissingProviders)
        {
            throw new InvalidOperationException(message);
        }

        Log.Warning(message);
    }

    builder.Services.AddScoped<IPaymentGateway, MercadoPagoPaymentGateway>();
}
else
{
    builder.Services.AddScoped<IPaymentGateway, StubPaymentGateway>();
}
var emailProvider = builder.Configuration.GetValue<string>("Email:Provider");
if (string.IsNullOrWhiteSpace(emailProvider))
{
    emailProvider = builder.Environment.IsProduction() ? "SendGrid" : "Console";
    Log.Warning("Email:Provider not configured. Defaulting to {Provider} in {Environment}.", emailProvider, builder.Environment.EnvironmentName);
}

if (emailProvider.Equals("Console", StringComparison.OrdinalIgnoreCase) && builder.Environment.IsProduction())
{
    Log.Warning("Email:Provider is Console in production. Outbound emails will not be delivered externally.");
}

if (emailProvider.Equals("SendGrid", StringComparison.OrdinalIgnoreCase))
{
    var sendGridKey = builder.Configuration["Email:SendGrid:ApiKey"];
    if (!string.IsNullOrWhiteSpace(sendGridKey))
    {
        builder.Services.AddScoped<IEmailService, SendGridEmailService>();
    }
    else
    {
        Log.Warning("Email:Provider is SendGrid but Email:SendGrid:ApiKey is missing. Falling back to ConsoleEmailService.");
        builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
    }
}
else if (emailProvider.Equals("Gmail", StringComparison.OrdinalIgnoreCase)
         || emailProvider.Equals("SMTP", StringComparison.OrdinalIgnoreCase))
{
    var smtpUser = builder.Configuration["Email:Gmail:User"];
    var smtpPass = builder.Configuration["Email:Gmail:Pass"];

    if (!string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
    {
        builder.Services.AddScoped<IEmailService, GmailSmtpEmailService>();
    }
    else
    {
        Log.Warning("Email:Provider is {Provider} but SMTP credentials are missing (Email:Gmail:User/Pass). Falling back to ConsoleEmailService.", emailProvider);
        builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
    }
}
else if (emailProvider.Equals("SES", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IEmailService, SesEmailService>();
}
else
{
    builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
}
if (builder.Environment.IsProduction() && emailProvider.Equals("Console", StringComparison.OrdinalIgnoreCase))
{
    var message = "Email provider resolved to Console in production. Configure SendGrid/SES/SMTP credentials.";
    if (failFastMissingProviders)
    {
        throw new InvalidOperationException(message);
    }

    Log.Warning(message);
}

var shippingBaseUrl = builder.Configuration["Shipping:Correios:BaseUrl"];
if (builder.Environment.IsProduction() && string.IsNullOrWhiteSpace(shippingBaseUrl))
{
    var message = "Shipping:Correios:BaseUrl is not configured in production. Shipping quotes will fall back to defaults.";
    if (failFastMissingProviders)
    {
        throw new InvalidOperationException(message);
    }

    Log.Warning(message);
}

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordHasher<Ecommerce.Domain.Entities.User>, PasswordHasher<Ecommerce.Domain.Entities.User>>();

builder.Services.AddHostedService<WebhookDeliveryWorker>();
builder.Services.AddHostedService<AnalyticsAggregationWorker>();
builder.Services.AddHostedService<Ecommerce.Infrastructure.BackgroundServices.EventWorker>();
builder.Services.AddHostedService<AutomatedReportWorker>();
builder.Services.AddHostedService<OperationalAlertWorker>();
builder.Services.AddHostedService<AbandonedCartRecoveryWorker>();
builder.Services.AddHostedService<LoyaltyCreditWorker>();
builder.Services.AddHostedService<DataRetentionWorker>();
builder.Services.AddHostedService<PostSalesEngagementWorker>();
builder.Services.AddHostedService<SubscriptionRecurringBillingWorker>();

// Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        var issuer = builder.Configuration["Jwt:Issuer"] ?? "ecommerce-api";
        var audience = builder.Configuration["Jwt:Audience"] ?? "ecommerce-admin";
        var secret = builder.Configuration["Jwt:SecretKey"] ?? "";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OwnerOrAdmin", policy => policy.Requirements.Add(new Ecommerce.API.Authorization.OwnerOrAdminRequirement()));
});

// Register authorization handler
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, Ecommerce.API.Authorization.OwnerOrAdminHandler>();

// Rate limiting
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// OpenTelemetry tracing (lightweight dev-friendly bootstrap)
var enableOtel = builder.Configuration.GetValue("Observability:EnableOpenTelemetry", builder.Environment.IsDevelopment());
if (enableOtel)
{
    // Register a TracerProvider instance manually to avoid relying on extension method availability
    builder.Services.AddSingleton(provider =>
    {
        var resource = ResourceBuilder.CreateDefault().AddService(builder.Environment.ApplicationName ?? "Ecommerce.API");
        var builderTp = Sdk.CreateTracerProviderBuilder()
            .SetResourceBuilder(resource)
            .AddAspNetCoreInstrumentation();

        // If OTLP endpoint configured, add OTLP exporter; otherwise use Console exporter for local development
        var otlpEndpoint = builder.Configuration["Observability:OtlpEndpoint"];
        if (!string.IsNullOrWhiteSpace(otlpEndpoint))
        {
            builderTp.AddOtlpExporter(o => { o.Endpoint = new Uri(otlpEndpoint); });
        }
        else
        {
            builderTp.AddConsoleExporter();
        }

        return builderTp.Build();
    });
}

var app = builder.Build();
var metrics = app.Services.GetRequiredService<MetricsRegistry>();
var requestLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Request");

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

var swaggerEnabled = builder.Configuration.GetValue<bool?>("Swagger:Enabled")
    ?? app.Environment.IsDevelopment();
Log.Information("Swagger enabled: {Enabled}", swaggerEnabled);
if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "E-Commerce API V1");
        c.RoutePrefix = "swagger";
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

var forwardedHeadersOptions = BuildForwardedHeadersOptions(builder.Configuration, app.Environment.IsDevelopment());
if (forwardedHeadersOptions != null)
{
    app.UseForwardedHeaders(forwardedHeadersOptions);
}

app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(correlationId))
    {
        correlationId = Guid.NewGuid().ToString("N");
    }

    context.Response.Headers["X-Correlation-Id"] = correlationId;
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
        if (!app.Environment.IsDevelopment() || !context.Request.Path.StartsWithSegments("/swagger"))
        {
            context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
        }
        return Task.CompletedTask;
    });

    using (requestLogger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await next();
        }
        finally
        {
            sw.Stop();
            requestLogger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
            metrics.RecordRequest(
                context.Request.Path,
                context.Request.Method,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
        }
    }
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseWebSockets();
app.UseCors("AllowFrontend");
app.UseIpRateLimiting();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/v1/auth", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    if (context.User?.Identity?.IsAuthenticated == true)
    {
        var sub = context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (Guid.TryParse(sub, out var userId))
        {
            var userService = context.RequestServices.GetRequiredService<UserService>();
            try
            {
                var currentUser = await userService.GetUserAsync(userId);
                if (currentUser.IsBlocked)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { message = "Account blocked" });
                    return;
                }
            }
            catch (KeyNotFoundException)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "User not found" });
                return;
            }
        }
    }

    await next();
});
app.UseAuthorization();
app.UseMiddleware<AdminAuditMiddleware>();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new { service = "Ecommerce API", status = "running", timestamp = DateTime.UtcNow }))
    .WithName("Root");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("Health");

app.MapGet("/metrics", (MetricsRegistry registry) =>
        Results.Text(registry.ToPrometheus(), "text/plain"))
    .RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" })
    .WithName("Metrics");

static IAsyncPolicy<HttpResponseMessage> GetMercadoPagoRetryPolicy()
    => HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => (int)msg.StatusCode == 429)
        .WaitAndRetryAsync(3, retry => TimeSpan.FromMilliseconds(200 * Math.Pow(2, retry)));

static IAsyncPolicy<HttpResponseMessage> GetMercadoPagoCircuitBreakerPolicy()
    => HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));

// Initialize database
try
{
    static async Task<bool> TableExistsAsync(EcommerceDbContext context, string tableName)
    {
        if (!context.Database.IsRelational())
        {
            return true;
        }

        var connection = context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var command = connection.CreateCommand();
        command.CommandText =
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = @name)";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "@name";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);

        var result = await command.ExecuteScalarAsync();
        return result is bool exists && exists;
    }

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Ecommerce.Domain.Entities.User>>();
        var seedDataEnabled = builder.Configuration.GetValue("Database:SeedData", builder.Environment.IsDevelopment());
        if (db.Database.IsRelational())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }

        var bootstrapAdminEmail =
            builder.Configuration["Auth:BootstrapAdmin:Email"]
            ?? builder.Configuration["Admin:Email"]
            ?? Environment.GetEnvironmentVariable("AUTH_BOOTSTRAP_ADMIN_EMAIL")
            ?? Environment.GetEnvironmentVariable("ADMIN_EMAIL");

        var bootstrapAdminPassword =
            builder.Configuration["Auth:BootstrapAdmin:Password"]
            ?? builder.Configuration["Admin:Password"]
            ?? Environment.GetEnvironmentVariable("AUTH_BOOTSTRAP_ADMIN_PASSWORD")
            ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD");

        if (!string.IsNullOrWhiteSpace(bootstrapAdminEmail) &&
            !string.IsNullOrWhiteSpace(bootstrapAdminPassword) &&
            await TableExistsAsync(db, "Users"))
        {
            var normalizedBootstrapEmail = bootstrapAdminEmail.Trim().ToLowerInvariant();
            var existingBootstrapAdmin = db.Users
                .AsEnumerable()
                .FirstOrDefault(u =>
                    !string.IsNullOrWhiteSpace(u.Email) &&
                    u.Email.Equals(normalizedBootstrapEmail, StringComparison.OrdinalIgnoreCase));

            if (existingBootstrapAdmin == null)
            {
                var newBootstrapAdmin = new Ecommerce.Domain.Entities.User
                {
                    Id = Guid.NewGuid(),
                    Email = normalizedBootstrapEmail,
                    FullName = "Admin User",
                    PasswordHash = "",
                    IsEmailVerified = true,
                    IsBlocked = false,
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow,
                };

                newBootstrapAdmin.PasswordHash = passwordHasher.HashPassword(newBootstrapAdmin, bootstrapAdminPassword);
                db.Users.Add(newBootstrapAdmin);
                await db.SaveChangesAsync();
                Console.WriteLine($"✅ Bootstrap admin created: {normalizedBootstrapEmail}");
            }
            else
            {
                existingBootstrapAdmin.Email = normalizedBootstrapEmail;
                existingBootstrapAdmin.Role = "Admin";
                existingBootstrapAdmin.IsEmailVerified = true;
                existingBootstrapAdmin.IsBlocked = false;
                existingBootstrapAdmin.PasswordHash = passwordHasher.HashPassword(existingBootstrapAdmin, bootstrapAdminPassword);

                db.Users.Update(existingBootstrapAdmin);
                await db.SaveChangesAsync();
                Console.WriteLine($"✅ Bootstrap admin updated: {normalizedBootstrapEmail}");
            }
        }

        if (!seedDataEnabled)
        {
            Console.WriteLine("ℹ️ Seed data disabled (Database:SeedData=false)");
        }

        // Seed demo user if no users exist
        if (seedDataEnabled && await TableExistsAsync(db, "Users") && !db.Users.Any())
        {
            var demoUser = new Ecommerce.Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Email = "admin@example.com",
                FullName = "Admin User",
                PasswordHash = "",
                IsEmailVerified = true,
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };

            demoUser.PasswordHash = passwordHasher.HashPassword(demoUser, "demo123");

            db.Users.Add(demoUser);
            await db.SaveChangesAsync();
            Console.WriteLine("✅ Demo user created: admin@example.com");
        }

        // Seed products if none exist
        if (seedDataEnabled && await TableExistsAsync(db, "Products") && !db.Products.Any())
        {
            var products = new[]
            {
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Laptop Pro 14\"",
                    Description = "Notebook premium com tela 2.8K, 16GB RAM e SSD 1TB.",
                    Price = 8999.90m,
                    Category = "Electronics",
                    Sku = "NOTEBOOK-PRO-14",
                    Stock = 12,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-45)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Mouse sem fio ergonômico",
                    Description = "Mouse 2.4GHz com 6 botões e DPI ajustável.",
                    Price = 119.90m,
                    Category = "Accessories",
                    Sku = "MOUSE-ERG-2400",
                    Stock = 80,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-35)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Hub USB-C 7 em 1",
                    Description = "HDMI 4K, 3x USB, SD/TF e Power Delivery.",
                    Price = 189.90m,
                    Category = "Accessories",
                    Sku = "HUB-USBC-7IN1",
                    Stock = 45,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-32)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Teclado mecânico RGB",
                    Description = "Switches red, layout ABNT2 e retroiluminação RGB.",
                    Price = 349.90m,
                    Category = "Accessories",
                    Sku = "KEY-RGB-ABNT2",
                    Stock = 38,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-28)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Monitor 27\" 4K",
                    Description = "Painel IPS 4K, HDR10 e 99% sRGB.",
                    Price = 1799.90m,
                    Category = "Electronics",
                    Sku = "MON-27-4K",
                    Stock = 18,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-26)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Webcam Full HD",
                    Description = "1080p 60fps com microfone duplo e foco automático.",
                    Price = 229.90m,
                    Category = "Accessories",
                    Sku = "WEBCAM-FHD-60",
                    Stock = 52,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-21)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Fone Bluetooth ANC",
                    Description = "Cancelamento ativo de ruído, 40h de bateria.",
                    Price = 699.90m,
                    Category = "Electronics",
                    Sku = "HEADPHONE-ANC-40H",
                    Stock = 28,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-18)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Smartwatch Fitness",
                    Description = "Monitor cardíaco, GPS integrado e resistência 5ATM.",
                    Price = 999.90m,
                    Category = "Electronics",
                    Sku = "SMARTWATCH-FIT",
                    Stock = 22,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-16)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Cafeteira Espresso 15 bar",
                    Description = "Bomba italiana, vaporizador e bandeja ajustável.",
                    Price = 1299.90m,
                    Category = "Home",
                    Sku = "COFFEE-ESP-15BAR",
                    Stock = 14,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-14)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Aspirador robô",
                    Description = "Mapeamento a laser, 2500Pa, recarga automática.",
                    Price = 1899.90m,
                    Category = "Home",
                    Sku = "ROBOTVAC-LASER",
                    Stock = 9,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-12)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Tênis corrida",
                    Description = "Amortecimento responsivo e tecido respirável.",
                    Price = 399.90m,
                    Category = "Sports",
                    Sku = "RUN-RESP-2025",
                    Stock = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-11)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Mochila notebook 15\"",
                    Description = "Compartimento acolchoado e bolso antifurto.",
                    Price = 199.90m,
                    Category = "Accessories",
                    Sku = "BAG-15-SEC",
                    Stock = 70,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-9)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "SSD NVMe 1TB",
                    Description = "Leitura 3500MB/s, compatível com PCIe 3.0.",
                    Price = 449.90m,
                    Category = "Electronics",
                    Sku = "SSD-NVME-1TB",
                    Stock = 40,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-8)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Smart TV 55\" 4K",
                    Description = "HDR10, Dolby Audio e apps integrados.",
                    Price = 2799.90m,
                    Category = "Electronics",
                    Sku = "TV-55-4K-2025",
                    Stock = 16,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-7)
                },
                new Ecommerce.Domain.Entities.Product
                {
                    Id = Guid.NewGuid(),
                    Name = "Kit skincare diário",
                    Description = "Limpeza, hidratação e protetor FPS 50.",
                    Price = 149.90m,
                    Category = "Beauty",
                    Sku = "SKIN-DAILY-KIT",
                    Stock = 85,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-6)
                }
            };

            db.Products.AddRange(products);
            await db.SaveChangesAsync();
            Console.WriteLine($"✅ {products.Length} demo products created");
        }

        // Seed demo orders if none exist
        if (seedDataEnabled && await TableExistsAsync(db, "Orders") && !db.Orders.Any())
        {
            var users = await db.Users.ToListAsync();
            if (users.Any())
            {
                var products = await db.Products.ToListAsync();
                var orders = new[]
                {
                    new Ecommerce.Domain.Entities.Order
                    {
                        Id = Guid.NewGuid(),
                        UserId = users.First().Id,
                        Status = Ecommerce.Domain.Entities.OrderStatus.Delivered,
                        TotalAmount = 1329.98m,
                        CreatedAt = DateTime.UtcNow.AddDays(-20)
                    },
                    new Ecommerce.Domain.Entities.Order
                    {
                        Id = Guid.NewGuid(),
                        UserId = users.First().Id,
                        Status = Ecommerce.Domain.Entities.OrderStatus.Processing,
                        TotalAmount = 459.97m,
                        CreatedAt = DateTime.UtcNow.AddDays(-5)
                    },
                    new Ecommerce.Domain.Entities.Order
                    {
                        Id = Guid.NewGuid(),
                        UserId = users.First().Id,
                        Status = Ecommerce.Domain.Entities.OrderStatus.Pending,
                        TotalAmount = 79.99m,
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    }
                };

                db.Orders.AddRange(orders);
                await db.SaveChangesAsync();
                Console.WriteLine($"✅ {orders.Length} demo orders created");
            }
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Database initialization error: {ex.Message}");
}

app.Run();

public partial class Program { }

