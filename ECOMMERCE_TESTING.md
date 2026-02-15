# TESTING SPECIFICATION - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Unit tests, integration tests, E2E tests, performance tests com exemplos práticos

---

## 1. TESTING PYRAMID & STRATEGY

```
              E2E Tests (10%)
           /                    \
        Integration Tests (30%)
       /                          \
    Unit Tests (60%)
```

### 1.1 Test Coverage Goals

```markdown
| Layer | Coverage Target | Focus |
|-------|-----------------|-------|
| Unit | 80%+ | Domain logic, services, utilities |
| Integration | 60%+ | Repository, external APIs (mocked) |
| E2E | 40%+ | Critical user flows |
| Performance | Key endpoints | Response time < 500ms |
```

---

## 2. UNIT TESTS

### 2.1 Domain Services - OrderService

```csharp
// test/Application/Services/OrderServiceTests.cs
using Xunit;
using Moq;
using FluentAssertions;

namespace Loja.Tests.Application.Services
{
  public class OrderServiceTests
  {
    private readonly Mock<IOrderRepository> _orderRepository;
    private readonly Mock<IInventoryService> _inventoryService;
    private readonly Mock<IPaymentService> _paymentService;
    private readonly Mock<IEmailService> _emailService;
    private readonly OrderService _orderService;

    public OrderServiceTests()
    {
      _orderRepository = new Mock<IOrderRepository>();
      _inventoryService = new Mock<IInventoryService>();
      _paymentService = new Mock<IPaymentService>();
      _emailService = new Mock<IEmailService>();

      _orderService = new OrderService(
        _orderRepository.Object,
        _inventoryService.Object,
        _paymentService.Object,
        _emailService.Object
      );
    }

    [Fact]
    public async Task CreateOrder_WithValidData_ShouldSucceed()
    {
      // Arrange
      var userId = Guid.NewGuid();
      var request = new CreateOrderRequest
      {
        Items = new List<OrderItemRequest>
        {
          new OrderItemRequest { ProductId = Guid.NewGuid(), Quantity = 2 }
        },
        ShippingAddressId = Guid.NewGuid()
      };

      _inventoryService
        .Setup(x => x.GetByProductAsync(It.IsAny<Guid>(), null))
        .ReturnsAsync(new InventoryDto { Quantity = 10, Status = "Active" });

      // Act
      var result = await _orderService.CreateOrderAsync(userId, request);

      // Assert
      result.Should().NotBeNull();
      result.Status.Should().Be("Pending");
      _orderRepository.Verify(x => x.AddAsync(It.IsAny<Order>()), Times.Once);
    }

    [Fact]
    public async Task CreateOrder_WithInsufficientStock_ShouldThrow()
    {
      // Arrange
      var userId = Guid.NewGuid();
      var productId = Guid.NewGuid();
      var request = new CreateOrderRequest
      {
        Items = new List<OrderItemRequest>
        {
          new OrderItemRequest { ProductId = productId, Quantity = 100 }
        },
        ShippingAddressId = Guid.NewGuid()
      };

      _inventoryService
        .Setup(x => x.GetByProductAsync(productId, null))
        .ReturnsAsync(new InventoryDto { Quantity = 5, Status = "LowStock" });

      // Act & Assert
      await Assert.ThrowsAsync<DomainException>(
        () => _orderService.CreateOrderAsync(userId, request)
      );

      _orderRepository.Verify(x => x.AddAsync(It.IsAny<Order>()), Times.Never);
    }

    [Fact]
    public async Task CancelOrder_BeforePayment_ShouldSucceed()
    {
      // Arrange
      var orderId = Guid.NewGuid();
      var order = new Order { Id = orderId, Status = OrderStatus.Pending };

      _orderRepository
        .Setup(x => x.GetByIdAsync(orderId))
        .ReturnsAsync(order);

      // Act
      var result = await _orderService.CancelOrderAsync(orderId);

      // Assert
      result.Status.Should().Be(OrderStatus.Cancelled);
      _orderRepository.Verify(x => x.UpdateAsync(order), Times.Once);
    }

    [Fact]
    public async Task CancelOrder_AfterPayment_ShouldThrow()
    {
      // Arrange
      var orderId = Guid.NewGuid();
      var order = new Order { Id = orderId, Status = OrderStatus.Paid };

      _orderRepository
        .Setup(x => x.GetByIdAsync(orderId))
        .ReturnsAsync(order);

      // Act & Assert
      await Assert.ThrowsAsync<DomainException>(
        () => _orderService.CancelOrderAsync(orderId)
      );
    }

    [Theory]
    [InlineData(100, 10, 110)]  // subtotal=100, tax=10, total=110
    [InlineData(1000, 150, 1150)]
    [InlineData(50, 7.5, 57.5)]
    public async Task CalculateOrderTotal_WithTax_ShouldBeCorrect(
      decimal subtotal, decimal expectedTax, decimal expectedTotal)
    {
      // Act
      var total = await _orderService.CalculateOrderTotalAsync(subtotal);

      // Assert
      total.Should().Be(expectedTotal);
    }

    [Fact]
    public async Task ApplyDiscount_WithValidCode_ShouldReduce()
    {
      // Arrange
      var orderId = Guid.NewGuid();
      var discountCode = "SAVE10";
      var order = new Order { Id = orderId, Total = 100 };

      _orderRepository.Setup(x => x.GetByIdAsync(orderId)).ReturnsAsync(order);

      // Act
      var result = await _orderService.ApplyDiscountAsync(orderId, discountCode);

      // Assert
      result.DiscountAmount.Should().Be(10);  // 10% discount
      result.Total.Should().Be(90);
    }
  }
}
```

### 2.2 Value Objects - Money

```csharp
// test/Domain/ValueObjects/MoneyTests.cs
public class MoneyTests
{
  [Fact]
  public void CreateMoney_WithValidAmount_ShouldSucceed()
  {
    // Act
    var money = new Money(100.50m, "BRL");

    // Assert
    money.Amount.Should().Be(100.50m);
    money.Currency.Should().Be("BRL");
  }

  [Fact]
  public void CreateMoney_WithNegativeAmount_ShouldThrow()
  {
    // Act & Assert
    Assert.Throws<DomainException>(() => new Money(-10, "BRL"));
  }

  [Fact]
  public void Add_TwoMonies_ShouldCombine()
  {
    // Arrange
    var money1 = new Money(100, "BRL");
    var money2 = new Money(50, "BRL");

    // Act
    var result = money1.Add(money2);

    // Assert
    result.Amount.Should().Be(150);
    result.Currency.Should().Be("BRL");
  }

  [Fact]
  public void Add_DifferentCurrencies_ShouldThrow()
  {
    // Arrange
    var money1 = new Money(100, "BRL");
    var money2 = new Money(50, "USD");

    // Act & Assert
    Assert.Throws<DomainException>(() => money1.Add(money2));
  }

  [Fact]
  public void ApplyTax_WithRate_ShouldCalculate()
  {
    // Arrange
    var money = new Money(100, "BRL");

    // Act
    var withTax = money.ApplyTax(0.15m);  // 15% tax

    // Assert
    withTax.Amount.Should().Be(115);
  }
}
```

### 2.3 Refund Service Tests

```csharp
// test/Application/Services/RefundServiceTests.cs
public class RefundServiceTests
{
  private readonly Mock<IRefundRepository> _refundRepository;
  private readonly Mock<IPaymentRepository> _paymentRepository;
  private readonly Mock<IOrderRepository> _orderRepository;
  private readonly Mock<IInventoryService> _inventoryService;
  private readonly Mock<IEmailService> _emailService;
  private readonly RefundService _refundService;

  public RefundServiceTests()
  {
    _refundRepository = new Mock<IRefundRepository>();
    _paymentRepository = new Mock<IPaymentRepository>();
    _orderRepository = new Mock<IOrderRepository>();
    _inventoryService = new Mock<IInventoryService>();
    _emailService = new Mock<IEmailService>();

    _refundService = new RefundService(
      _refundRepository.Object,
      _paymentRepository.Object,
      _orderRepository.Object,
      _inventoryService.Object,
      _emailService.Object
    );
  }

  [Fact]
  public async Task RequestRefund_WithinWindow_ShouldSucceed()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var orderId = Guid.NewGuid();
    var order = new Order
    {
      Id = orderId,
      UserId = userId,
      Status = OrderStatus.Paid,
      CreatedAt = DateTime.UtcNow.AddDays(-15),
      Total = 100
    };

    _orderRepository.Setup(x => x.GetByIdAsync(orderId)).ReturnsAsync(order);
    _refundRepository.Setup(x => x.GetPendingByOrderAsync(orderId)).ReturnsAsync((Refund)null);

    // Act
    var result = await _refundService.RequestRefundAsync(
      orderId,
      userId,
      new RefundRequestDto { Reason = "customer_request" }
    );

    // Assert
    result.Should().NotBeNull();
    result.Status.Should().Be(RefundStatus.Pending);
  }

  [Fact]
  public async Task RequestRefund_OutsideWindow_ShouldThrow()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var orderId = Guid.NewGuid();
    var order = new Order
    {
      Id = orderId,
      UserId = userId,
      CreatedAt = DateTime.UtcNow.AddDays(-35)  // 35 days ago
    };

    _orderRepository.Setup(x => x.GetByIdAsync(orderId)).ReturnsAsync(order);

    // Act & Assert
    await Assert.ThrowsAsync<DomainException>(
      () => _refundService.RequestRefundAsync(orderId, userId, new RefundRequestDto())
    );
  }

  [Fact]
  public async Task ApproveRefund_WithValidData_ShouldUpdate()
  {
    // Arrange
    var refundId = Guid.NewGuid();
    var adminId = Guid.NewGuid();
    var refund = new Refund
    {
      Id = refundId,
      Status = RefundStatus.Pending,
      Amount = 100
    };

    _refundRepository.Setup(x => x.GetByIdAsync(refundId)).ReturnsAsync(refund);

    // Act
    var result = await _refundService.ApproveRefundAsync(
      refundId,
      adminId,
      new ApproveRefundRequest { AdminNotes = "Approved" }
    );

    // Assert
    result.Status.Should().Be(RefundStatus.Approved);
    result.ApprovedByAdminId.Should().Be(adminId);
  }
}
```

---

## 3. INTEGRATION TESTS

### 3.1 Repository Tests

```csharp
// test/Infrastructure/Repositories/OrderRepositoryTests.cs
using Xunit;
using FluentAssertions;

namespace Loja.Tests.Infrastructure.Repositories
{
  [Collection("Database collection")]
  public class OrderRepositoryTests : IAsyncLifetime
  {
    private readonly ApplicationDbContext _context;
    private readonly OrderRepository _repository;

    public OrderRepositoryTests(DatabaseFixture fixture)
    {
      _context = fixture.CreateContext();
      _repository = new OrderRepository(_context);
    }

    public async Task InitializeAsync()
    {
      await _context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
      await _context.Database.EnsureDeletedAsync();
      await _context.DisposeAsync();
    }

    [Fact]
    public async Task AddOrder_ShouldPersist()
    {
      // Arrange
      var order = new Order
      {
        UserId = Guid.NewGuid(),
        Status = OrderStatus.Pending,
        Total = 100,
        CreatedAt = DateTime.UtcNow
      };

      // Act
      await _repository.AddAsync(order);

      // Assert
      var retrieved = await _repository.GetByIdAsync(order.Id);
      retrieved.Should().NotBeNull();
      retrieved.Total.Should().Be(100);
    }

    [Fact]
    public async Task GetByUserId_ShouldReturnUserOrders()
    {
      // Arrange
      var userId = Guid.NewGuid();
      var order1 = new Order { UserId = userId, Status = OrderStatus.Pending };
      var order2 = new Order { UserId = userId, Status = OrderStatus.Paid };
      var order3 = new Order { UserId = Guid.NewGuid(), Status = OrderStatus.Pending };

      await _repository.AddAsync(order1);
      await _repository.AddAsync(order2);
      await _repository.AddAsync(order3);

      // Act
      var results = await _repository.GetByUserAsync(userId);

      // Assert
      results.Should().HaveCount(2);
      results.Should().AllSatisfy(x => x.UserId.Should().Be(userId));
    }

    [Fact]
    public async Task UpdateOrder_ShouldModifyFields()
    {
      // Arrange
      var order = new Order { Status = OrderStatus.Pending, Total = 100 };
      await _repository.AddAsync(order);

      // Act
      order.Status = OrderStatus.Paid;
      order.Total = 110;
      await _repository.UpdateAsync(order);

      // Assert
      var retrieved = await _repository.GetByIdAsync(order.Id);
      retrieved.Status.Should().Be(OrderStatus.Paid);
      retrieved.Total.Should().Be(110);
    }

    [Fact]
    public async Task DeleteOrder_ShouldRemove()
    {
      // Arrange
      var order = new Order { Status = OrderStatus.Pending };
      await _repository.AddAsync(order);

      // Act
      await _repository.DeleteAsync(order.Id);

      // Assert
      var retrieved = await _repository.GetByIdAsync(order.Id);
      retrieved.Should().BeNull();
    }
  }
}
```

### 3.2 API Integration Tests

```csharp
// test/API/Controllers/OrdersControllerTests.cs
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;

namespace Loja.Tests.API.Controllers
{
  public class OrdersControllerTests : IAsyncLifetime
  {
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private string _authToken;

    public OrdersControllerTests()
    {
      _factory = new WebApplicationFactory<Program>()
        .WithWebHostBuilder(builder =>
        {
          builder.ConfigureServices(services =>
          {
            // Replace DB with in-memory for tests
            services.AddScoped(sp =>
            {
              var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase("test-db")
                .Options;
              return new ApplicationDbContext(options);
            });
          });
        });

      _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
      // Create test user and get auth token
      var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", new
      {
        email = "test@example.com",
        password = "Password123!",
        name = "Test User"
      });

      var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
      {
        email = "test@example.com",
        password = "Password123!"
      });

      var loginContent = await loginResponse.Content.ReadAsAsync<dynamic>();
      _authToken = loginContent.accessToken;

      _client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);
    }

    public async Task DisposeAsync()
    {
      _client?.Dispose();
      _factory?.Dispose();
    }

    [Fact]
    public async Task CreateOrder_ShouldReturn201()
    {
      // Arrange
      var request = new
      {
        items = new[]
        {
          new { productId = Guid.NewGuid(), quantity = 2 }
        },
        shippingAddressId = Guid.NewGuid()
      };

      // Act
      var response = await _client.PostAsJsonAsync("/api/v1/orders", request);

      // Assert
      response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);
      var content = await response.Content.ReadAsAsync<dynamic>();
      content.id.Should().NotBeEmpty();
      content.status.Should().Be("Pending");
    }

    [Fact]
    public async Task GetOrder_ShouldReturnOrder()
    {
      // Act
      var response = await _client.GetAsync("/api/v1/orders");

      // Assert
      response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
      var content = await response.Content.ReadAsAsync<dynamic>();
      content.Should().NotBeNull();
    }

    [Fact]
    public async Task Unauthorized_ShouldReturn401()
    {
      // Arrange
      var unauthorizedClient = _factory.CreateClient();

      // Act
      var response = await unauthorizedClient.GetAsync("/api/v1/orders");

      // Assert
      response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }
  }
}
```

---

## 4. END-TO-END TESTS

### 4.1 Checkout Flow Test

```csharp
// test/E2E/CheckoutFlowTests.cs
using Xunit;
using Playwright;
using FluentAssertions;

namespace Loja.Tests.E2E
{
  public class CheckoutFlowTests : IAsyncLifetime
  {
    private IBrowser _browser;
    private IPage _page;
    private const string BaseUrl = "https://localhost:3000";

    public async Task InitializeAsync()
    {
      var playwright = await Playwright.CreateAsync();
      _browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
      {
        Headless = true
      });
      _page = await _browser.NewPageAsync();
    }

    public async Task DisposeAsync()
    {
      await _page?.CloseAsync();
      await _browser?.CloseAsync();
    }

    [Fact]
    public async Task CompleteCheckout_ShouldCreateOrder()
    {
      // Step 1: Navigate to homepage
      await _page.GotoAsync($"{BaseUrl}/");
      await _page.WaitForLoadStateAsync(LoadState.NetworkIdle);

      // Step 2: Add product to cart
      var addToCartButton = _page.Locator("button:has-text('Add to Cart')").First;
      await addToCartButton.ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Step 3: Go to cart
      await _page.Locator("a:has-text('Cart')").ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Step 4: Proceed to checkout
      await _page.Locator("button:has-text('Checkout')").ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Step 5: Fill shipping address
      await _page.FillAsync("input[name='street']", "123 Main St");
      await _page.FillAsync("input[name='city']", "São Paulo");
      await _page.FillAsync("input[name='postalCode']", "01234-567");

      // Step 6: Select shipping method
      await _page.Locator("label:has-text('Express')").ClickAsync();

      // Step 7: Proceed to payment
      await _page.Locator("button:has-text('Continue to Payment')").ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Step 8: Fill payment info (Stripe mock)
      await _page.FillAsync("input[name='cardNumber']", "4242424242424242");
      await _page.FillAsync("input[name='expiry']", "12/25");
      await _page.FillAsync("input[name='cvc']", "123");

      // Step 9: Complete purchase
      await _page.Locator("button:has-text('Complete Purchase')").ClickAsync();

      // Assert
      await _page.WaitForLoadStateAsync();
      var successMessage = await _page.Locator("text=Order confirmed").IsVisibleAsync();
      successMessage.Should().BeTrue();

      var orderNumber = await _page.Locator("text=Order #").TextContentAsync();
      orderNumber.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_And_Checkout_ShouldUseUserAddress()
    {
      // Login
      await _page.GotoAsync($"{BaseUrl}/login");
      await _page.FillAsync("input[type='email']", "user@example.com");
      await _page.FillAsync("input[type='password']", "Password123!");
      await _page.Locator("button:has-text('Login')").ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Add to cart and checkout
      await _page.GotoAsync($"{BaseUrl}/products/123");
      await _page.Locator("button:has-text('Add to Cart')").ClickAsync();
      await _page.Locator("a:has-text('Cart')").ClickAsync();
      await _page.Locator("button:has-text('Checkout')").ClickAsync();
      await _page.WaitForLoadStateAsync();

      // Verify saved address is pre-filled
      var streetValue = await _page.InputValueAsync("input[name='street']");
      streetValue.Should().NotBeEmpty();
    }
  }
}
```

### 4.2 Login & 2FA Test

```csharp
// test/E2E/TwoFactorAuthTests.cs
public class TwoFactorAuthTests : IAsyncLifetime
{
  private IBrowser _browser;
  private IPage _page;

  public async Task InitializeAsync()
  {
    var playwright = await Playwright.CreateAsync();
    _browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
    {
      Headless = true
    });
    _page = await _browser.NewPageAsync();
  }

  public async Task DisposeAsync()
  {
    await _page?.CloseAsync();
    await _browser?.CloseAsync();
  }

  [Fact]
  public async Task LoginWith2FA_ShouldRequireCode()
  {
    // Navigate to login
    await _page.GotoAsync("https://localhost:3000/login");

    // Enter credentials
    await _page.FillAsync("input[type='email']", "2fa-user@example.com");
    await _page.FillAsync("input[type='password']", "Password123!");
    await _page.Locator("button:has-text('Login')").ClickAsync();

    // Wait for 2FA challenge screen
    await _page.WaitForSelectorAsync("text=Verificação em Dois Fatores");

    // Should show TOTP input
    var totpInput = _page.Locator("input[placeholder='000000']");
    await totpInput.IsVisibleAsync().Should().BeAsync(true);

    // Should show recovery code option
    var recoveryLink = _page.Locator("text=Usar código de recuperação");
    await recoveryLink.IsVisibleAsync().Should().BeAsync(true);
  }

  [Fact]
  public async Task Setup2FA_ShouldShowQRCode()
  {
    // Login
    await _page.GotoAsync("https://localhost:3000/login");
    // ... login flow ...

    // Go to security settings
    await _page.Locator("text=Settings").ClickAsync();
    await _page.Locator("text=Security").ClickAsync();

    // Click enable 2FA
    await _page.Locator("button:has-text('Enable 2FA')").ClickAsync();
    await _page.WaitForLoadStateAsync();

    // Should show QR code
    var qrCode = _page.Locator("img[alt='QR Code']");
    await qrCode.IsVisibleAsync().Should().BeAsync(true);

    // Should show manual key
    var manualKey = _page.Locator("code");
    var keyContent = await manualKey.TextContentAsync();
    keyContent.Should().NotBeNullOrEmpty();
  }
}
```

---

## 5. PERFORMANCE TESTS

### 5.1 Load Testing (k6)

```javascript
// test/performance/checkout.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m30s', target: 20 }, // Stay at 20
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% requests < 500ms
    http_req_failed: ['rate<0.1'],      // <10% failure rate
  },
};

export default function () {
  const rawBaseUrl = __ENV.API_BASE_URL || 'http://localhost:5071';
  const apiBase = rawBaseUrl.replace(/\/+$/, '');
  const baseUrl = apiBase.endsWith('/api/v1') ? apiBase : `${apiBase}/api/v1`;
  const authToken = __ENV.AUTH_TOKEN;

  // 1. Get cart
  const cartRes = http.get(`${baseUrl}/carts`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  check(cartRes, {
    'cart status is 200': (r) => r.status === 200,
    'cart response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 2. Create order
  const orderRes = http.post(`${baseUrl}/orders`, JSON.stringify({
    items: [{ productId: 'prod-123', quantity: 2 }],
    shippingAddressId: 'addr-456',
  }), {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  check(orderRes, {
    'order creation status is 201': (r) => r.status === 201,
    'order response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // 3. Process payment
  const paymentRes = http.post(`${baseUrl}/payments`, JSON.stringify({
    orderId: orderRes.json('id'),
    amount: 100,
    method: 'card',
  }), {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  check(paymentRes, {
    'payment status is 201': (r) => r.status === 201,
    'payment response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(2);
}

// Run: API_BASE_URL=http://localhost:5071 AUTH_TOKEN=... k6 run test/performance/checkout.js
```

---

## 6. TEST CONFIGURATION

### 6.1 xUnit Setup (C#)

```csharp
// test/xunit.runner.json
{
  "diagnosticMessages": false,
  "parallelizeAssembly": true,
  "parallelizeTestCollections": true,
  "maxParallelThreads": 4
}

// test/Fixtures/DatabaseFixture.cs
public class DatabaseFixture
{
  private const string ConnectionString = 
    "Server=(localdb)\\mssqllocaldb;Database=loja-test;Integrated Security=true;";

  public ApplicationDbContext CreateContext()
  {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseSqlServer(ConnectionString)
      .Options;

    var context = new ApplicationDbContext(options);
    return context;
  }
}

[CollectionDefinition("Database collection")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
{
  // This has no code, just used to define the collection
}
```

### 6.2 Vitest Setup (Frontend)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// test/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

---

## 7. CI/CD TEST PIPELINE

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0'

      - name: Restore
        run: dotnet restore

      - name: Build
        run: dotnet build --configuration Release

      - name: Run Unit Tests
        run: dotnet test --filter "Category=Unit" --configuration Release

      - name: Run Integration Tests
        run: dotnet test --filter "Category=Integration" --configuration Release

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install
        run: npm ci

      - name: Test
        run: npm run test

      - name: Coverage
        run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Playwright
        run: npm install -D @playwright/test

      - name: Run E2E Tests
        run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run k6 Load Tests
        uses: grafana/k6-action@v0.3.0
        with:
          filename: test/performance/checkout.js
          cloud: false
```

---

## 8. TESTING CHECKLIST

```markdown
## Implementation Checklist

### Unit Tests (C#)
- [ ] OrderService (6 tests)
- [ ] RefundService (5 tests)
- [ ] PaymentService (4 tests)
- [ ] InventoryService (5 tests)
- [ ] Money value object (5 tests)
- [ ] Email value object (3 tests)
- [ ] Total: 28+ unit tests at 80%+ coverage

### Integration Tests
- [ ] OrderRepository (4 tests)
- [ ] PaymentRepository (3 tests)
- [ ] OrdersController (4 tests)
- [ ] PaymentsController (3 tests)
- [ ] AuthController (4 tests)
- [ ] Total: 18+ integration tests

### E2E Tests (Playwright)
- [ ] Complete checkout flow
- [ ] Login with 2FA
- [ ] Setup 2FA
- [ ] Request refund
- [ ] Admin dashboard
- [ ] Total: 5+ E2E scenarios

### Frontend Tests (Vitest)
- [ ] Cart store mutations (5 tests)
- [ ] Auth hooks (4 tests)
- [ ] Checkout components (3 tests)
- [ ] Total: 12+ frontend tests

### Performance Tests
- [ ] Checkout endpoint < 300ms
- [ ] Payment processing < 500ms
- [ ] Order listing < 200ms
- [ ] Load: 20 concurrent users

### CI/CD
- [ ] GitHub Actions workflow
- [ ] Automatic test on PR
- [ ] Coverage reports
- [ ] E2E artifact upload
```

---

**Testing Specification Completo ✅**
