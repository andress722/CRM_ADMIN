# ANALYTICS & REPORTING SYSTEM - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Dashboards, reports, KPI tracking, data analysis

---

## 1. ANALYTICS ENTITIES & EVENTS

### 1.1 Domain Model

```csharp
// Domain/Entities/Analytics/AnalyticsEvent.cs
public class AnalyticsEvent
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid? SessionId { get; set; }
  public AnalyticsEventType Type { get; set; }
  public string Category { get; set; }
  public string Action { get; set; }
  public string Label { get; set; }
  public decimal? Value { get; set; }
  public string Url { get; set; }
  public string Referrer { get; set; }
  public string UserAgent { get; set; }
  public string IpAddress { get; set; }
  public Dictionary<string, object> CustomData { get; set; }
  public DateTime CreatedAt { get; set; }
}

public enum AnalyticsEventType
{
  PageView,
  ProductView,
  ProductClick,
  AddToCart,
  RemoveFromCart,
  Checkout,
  Purchase,
  Refund,
  Search,
  Filter,
  SignUp,
  Login,
  ShareProduct,
  AddToWishlist
}

// KPI snapshots (daily aggregations)
public class DailyKPI
{
  public Guid Id { get; set; }
  public DateTime Date { get; set; }
  
  // Revenue metrics
  public decimal TotalRevenue { get; set; }
  public decimal AverageOrderValue { get; set; }
  public int TotalOrders { get; set; }
  
  // Customer metrics
  public int NewCustomers { get; set; }
  public int ReturningCustomers { get; set; }
  public int TotalVisits { get; set; }
  
  // Conversion
  public decimal ConversionRate { get; set; }
  public int CartAbandonment { get; set; }
  
  // Products
  public int TotalProductsViewed { get; set; }
  public int TotalProductsPurchased { get; set; }
  
  // Performance
  public decimal AverageSessionDuration { get; set; }
  public decimal BounceRate { get; set; }
}

// Product analytics
public class ProductAnalytics
{
  public Guid Id { get; set; }
  public Guid ProductId { get; set; }
  public DateTime Date { get; set; }
  
  public int Views { get; set; }
  public int Clicks { get; set; }
  public int CartAdds { get; set; }
  public int Purchases { get; set; }
  public decimal Revenue { get; set; }
  public decimal ConversionRate { get; set; }  // Purchases / Views
  
  public Product Product { get; set; }
}

// Campaign/Channel analytics
public class ChannelAnalytics
{
  public Guid Id { get; set; }
  public string Channel { get; set; }             // 'organic', 'direct', 'email', 'social'
  public DateTime Date { get; set; }
  
  public int Sessions { get; set; }
  public int Users { get; set; }
  public decimal Revenue { get; set; }
  public int Orders { get; set; }
  public decimal ConversionRate { get; set; }
}
```

### 1.2 PostgreSQL DDL

```sql
-- Analytics events (time-series, can be partitioned)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  action VARCHAR(100),
  label VARCHAR(100),
  value DECIMAL(10,2),
  url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  custom_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Partition by month for better performance
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE INDEX idx_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_events_type ON analytics_events(type);

-- Daily KPI snapshots
CREATE TABLE daily_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_revenue DECIMAL(10,2),
  average_order_value DECIMAL(10,2),
  total_orders INT,
  new_customers INT,
  returning_customers INT,
  total_visits INT,
  conversion_rate DECIMAL(5,2),
  cart_abandonment INT,
  total_products_viewed INT,
  total_products_purchased INT,
  average_session_duration DECIMAL(8,2),
  bounce_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_kpis_date ON daily_kpis(date DESC);

-- Product analytics
CREATE TABLE product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  date DATE NOT NULL,
  views INT DEFAULT 0,
  clicks INT DEFAULT 0,
  cart_adds INT DEFAULT 0,
  purchases INT DEFAULT 0,
  revenue DECIMAL(10,2),
  conversion_rate DECIMAL(5,2),
  
  UNIQUE(product_id, date)
);

CREATE INDEX idx_product_analytics_date ON product_analytics(date DESC);
CREATE INDEX idx_product_analytics_product_id ON product_analytics(product_id);

-- Channel analytics
CREATE TABLE channel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  sessions INT,
  users INT,
  revenue DECIMAL(10,2),
  orders INT,
  conversion_rate DECIMAL(5,2),
  
  UNIQUE(channel, date)
);

CREATE INDEX idx_channel_analytics_date ON channel_analytics(date DESC);
```

---

## 2. ANALYTICS SERVICE

```csharp
// Application/Services/AnalyticsService.cs
public interface IAnalyticsService
{
  Task TrackEventAsync(AnalyticsEventDto @event);
  Task<DashboardMetricsDto> GetDashboardMetricsAsync(DateTime from, DateTime to);
  Task<IEnumerable<ProductAnalyticsDto>> GetTopProductsAsync(int count = 10);
  Task<IEnumerable<ChannelAnalyticsDto>> GetChannelAnalyticsAsync(DateTime from, DateTime to);
  Task<RevenueReportDto> GenerateRevenueReportAsync(DateTime from, DateTime to);
  Task<CustomerReportDto> GenerateCustomerReportAsync(DateTime from, DateTime to);
  Task AggregateMetricsAsync(DateTime date);  // Scheduled job
}

public class AnalyticsService : IAnalyticsService
{
  private readonly IAnalyticsEventRepository _eventRepository;
  private readonly IDailyKPIRepository _kpiRepository;
  private readonly IProductAnalyticsRepository _productAnalyticsRepository;
  private readonly IChannelAnalyticsRepository _channelAnalyticsRepository;
  private readonly IOrderRepository _orderRepository;
  private readonly ILogger<AnalyticsService> _logger;

  public AnalyticsService(
    IAnalyticsEventRepository eventRepository,
    IDailyKPIRepository kpiRepository,
    IProductAnalyticsRepository productAnalyticsRepository,
    IChannelAnalyticsRepository channelAnalyticsRepository,
    IOrderRepository orderRepository,
    ILogger<AnalyticsService> logger)
  {
    _eventRepository = eventRepository;
    _kpiRepository = kpiRepository;
    _productAnalyticsRepository = productAnalyticsRepository;
    _channelAnalyticsRepository = channelAnalyticsRepository;
    _orderRepository = orderRepository;
    _logger = logger;
  }

  // 1. TRACK EVENT (Frontend -> Backend)
  public async Task TrackEventAsync(AnalyticsEventDto @event)
  {
    var analyticsEvent = new AnalyticsEvent
    {
      UserId = @event.UserId,
      SessionId = @event.SessionId,
      Type = Enum.Parse<AnalyticsEventType>(@event.Type),
      Category = @event.Category,
      Action = @event.Action,
      Label = @event.Label,
      Value = @event.Value,
      Url = @event.Url,
      Referrer = @event.Referrer,
      UserAgent = @event.UserAgent,
      IpAddress = @event.IpAddress,
      CustomData = @event.CustomData,
      CreatedAt = DateTime.UtcNow
    };

    await _eventRepository.AddAsync(analyticsEvent);

    _logger.LogDebug("Event tracked: {type} - {action}", @event.Type, @event.Action);
  }

  // 2. GET DASHBOARD METRICS
  public async Task<DashboardMetricsDto> GetDashboardMetricsAsync(DateTime from, DateTime to)
  {
    // Get KPIs for date range
    var kpis = await _kpiRepository.GetAsync(
      predicate: x => x.Date >= from.Date && x.Date <= to.Date,
      orderBy: q => q.OrderBy(x => x.Date)
    );

    var totalRevenue = kpis.Sum(x => x.TotalRevenue);
    var totalOrders = kpis.Sum(x => x.TotalOrders);
    var newCustomers = kpis.Sum(x => x.NewCustomers);
    var avgConversion = kpis.Any() ? kpis.Average(x => x.ConversionRate) : 0;

    return new DashboardMetricsDto
    {
      TotalRevenue = totalRevenue,
      TotalOrders = totalOrders,
      AverageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0,
      NewCustomers = newCustomers,
      ConversionRate = avgConversion,
      DateRange = new { from, to }
    };
  }

  // 3. TOP PRODUCTS
  public async Task<IEnumerable<ProductAnalyticsDto>> GetTopProductsAsync(int count = 10)
  {
    var today = DateTime.UtcNow.Date;
    var last30Days = today.AddDays(-30);

    var products = await _productAnalyticsRepository.GetAsync(
      predicate: x => x.Date >= last30Days && x.Date <= today,
      orderBy: q => q.OrderByDescending(x => x.Revenue),
      pageSize: count
    );

    return products.GroupBy(x => x.ProductId)
      .Select(g => new ProductAnalyticsDto
      {
        ProductId = g.Key,
        TotalRevenue = g.Sum(x => x.Revenue),
        TotalPurchases = g.Sum(x => x.Purchases),
        AvgConversionRate = g.Average(x => x.ConversionRate),
        TotalViews = g.Sum(x => x.Views)
      })
      .OrderByDescending(x => x.TotalRevenue)
      .Take(count);
  }

  // 4. CHANNEL ANALYTICS
  public async Task<IEnumerable<ChannelAnalyticsDto>> GetChannelAnalyticsAsync(
    DateTime from, DateTime to)
  {
    var analytics = await _channelAnalyticsRepository.GetAsync(
      predicate: x => x.Date >= from.Date && x.Date <= to.Date,
      groupBy: x => x.Channel
    );

    return analytics.Select(g => new ChannelAnalyticsDto
    {
      Channel = g.Key,
      TotalSessions = g.Sum(x => x.Sessions),
      TotalUsers = g.Sum(x => x.Users),
      TotalRevenue = g.Sum(x => x.Revenue),
      TotalOrders = g.Sum(x => x.Orders),
      AvgConversionRate = g.Average(x => x.ConversionRate)
    });
  }

  // 5. REVENUE REPORT
  public async Task<RevenueReportDto> GenerateRevenueReportAsync(DateTime from, DateTime to)
  {
    var orders = await _orderRepository.GetAsync(
      predicate: x => x.CreatedAt >= from && x.CreatedAt <= to
    );

    var dailyRevenue = orders
      .GroupBy(x => x.CreatedAt.Date)
      .Select(g => new
      {
        Date = g.Key,
        Revenue = g.Sum(x => x.Total),
        Orders = g.Count()
      })
      .OrderBy(x => x.Date);

    return new RevenueReportDto
    {
      TotalRevenue = orders.Sum(x => x.Total),
      TotalOrders = orders.Count,
      AverageOrderValue = orders.Count > 0 ? orders.Sum(x => x.Total) / orders.Count : 0,
      DailyRevenue = dailyRevenue
    };
  }

  // 6. CUSTOMER REPORT
  public async Task<CustomerReportDto> GenerateCustomerReportAsync(DateTime from, DateTime to)
  {
    var events = await _eventRepository.GetAsync(
      predicate: x => x.CreatedAt >= from && x.CreatedAt <= to
    );

    var newSignups = events.Where(x => x.Type == AnalyticsEventType.SignUp).Count();
    var returningUsers = events.GroupBy(x => x.UserId).Count(g => g.Count() > 1);

    return new CustomerReportDto
    {
      NewSignups = newSignups,
      ReturningCustomers = returningUsers,
      TotalSessions = events.GroupBy(x => x.SessionId).Count(),
      AverageSessionDuration = CalculateAvgSessionDuration(events)
    };
  }

  // 7. AGGREGATE METRICS (Daily job)
  public async Task AggregateMetricsAsync(DateTime date)
  {
    // Get all events for the day
    var events = await _eventRepository.GetAsync(
      predicate: x => x.CreatedAt.Date == date.Date
    );

    var orders = await _orderRepository.GetAsync(
      predicate: x => x.CreatedAt.Date == date.Date
    );

    // Calculate KPIs
    var kpi = new DailyKPI
    {
      Date = date.Date,
      TotalRevenue = orders.Sum(x => x.Total),
      TotalOrders = orders.Count,
      AverageOrderValue = orders.Count > 0 ? orders.Sum(x => x.Total) / orders.Count : 0,
      NewCustomers = events.Where(x => x.Type == AnalyticsEventType.SignUp).Count(),
      TotalVisits = events.GroupBy(x => x.SessionId).Count(),
      ConversionRate = CalculateConversionRate(events, orders),
      CartAbandonment = events.Where(x => x.Type == AnalyticsEventType.RemoveFromCart).Count()
    };

    await _kpiRepository.AddAsync(kpi);

    // Product analytics
    var productEvents = events.Where(x => x.Type == AnalyticsEventType.ProductView || 
                                          x.Type == AnalyticsEventType.ProductClick);

    foreach (var product in productEvents.GroupBy(x => x.Label))
    {
      if (Guid.TryParse(product.Key, out var productId))
      {
        var productAnalytics = new ProductAnalytics
        {
          ProductId = productId,
          Date = date.Date,
          Views = product.Where(x => x.Type == AnalyticsEventType.ProductView).Count(),
          Clicks = product.Where(x => x.Type == AnalyticsEventType.ProductClick).Count(),
          CartAdds = events.Where(x => x.Type == AnalyticsEventType.AddToCart && 
                                       x.Label == product.Key).Count(),
          Purchases = orders.Sum(x => x.Items.Count(i => i.ProductId == productId))
        };

        await _productAnalyticsRepository.AddAsync(productAnalytics);
      }
    }

    _logger.LogInformation("Metrics aggregated for {date}", date.Date);
  }

  private decimal CalculateConversionRate(IEnumerable<AnalyticsEvent> events, IEnumerable<Order> orders)
  {
    var sessions = events.GroupBy(x => x.SessionId).Count();
    return sessions > 0 ? (orders.Count / (decimal)sessions) * 100 : 0;
  }

  private decimal CalculateAvgSessionDuration(IEnumerable<AnalyticsEvent> events)
  {
    var sessions = events.GroupBy(x => x.SessionId);
    if (!sessions.Any()) return 0;

    var durations = sessions.Select(session =>
    {
      var firstEvent = session.Min(x => x.CreatedAt);
      var lastEvent = session.Max(x => x.CreatedAt);
      return (lastEvent - firstEvent).TotalSeconds;
    });

    return (decimal)durations.Average();
  }
}
```

---

## 3. ANALYTICS DASHBOARD (FRONTEND)

```typescript
// src/app/(admin)/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { LineChart, BarChart, Card, DateRangePicker } from '@/components/ui';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const [metricsRes, productsRes, channelsRes] = await Promise.all([
        api.get('/admin/analytics/dashboard', {
          params: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          }
        }),
        api.get('/admin/analytics/top-products'),
        api.get('/admin/analytics/channels', {
          params: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          }
        })
      ]);

      setMetrics(metricsRes.data);
      setTopProducts(productsRes.data);
      setChannelData(channelsRes.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-gray-600">Total Revenue</div>
          <div className="text-3xl font-bold">
            R$ {metrics?.totalRevenue.toLocaleString('pt-BR')}
          </div>
        </Card>
        <Card>
          <div className="text-gray-600">Total Orders</div>
          <div className="text-3xl font-bold">{metrics?.totalOrders}</div>
        </Card>
        <Card>
          <div className="text-gray-600">Avg Order Value</div>
          <div className="text-3xl font-bold">
            R$ {metrics?.averageOrderValue.toLocaleString('pt-BR')}
          </div>
        </Card>
        <Card>
          <div className="text-gray-600">Conversion Rate</div>
          <div className="text-3xl font-bold">{metrics?.conversionRate.toFixed(2)}%</div>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Revenue Trend</h2>
        <LineChart
          data={metrics?.dailyRevenue || []}
          xKey="date"
          yKey="revenue"
          height={300}
        />
      </Card>

      {/* Channel Performance */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Channel Performance</h2>
        <div className="grid grid-cols-4 gap-4">
          {channelData.map(channel => (
            <div key={channel.channel} className="border rounded p-4">
              <div className="text-sm text-gray-600">{channel.channel}</div>
              <div className="text-2xl font-bold">{channel.totalOrders}</div>
              <div className="text-sm text-green-600">
                R$ {channel.totalRevenue.toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Products */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Top Selling Products</h2>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2">Product</th>
              <th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Purchases</th>
              <th className="text-right py-2">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(product => (
              <tr key={product.productId} className="border-b">
                <td className="py-2">{product.productName}</td>
                <td className="text-right">R$ {product.totalRevenue.toLocaleString('pt-BR')}</td>
                <td className="text-right">{product.totalPurchases}</td>
                <td className="text-right">{product.avgConversionRate.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

---

## 4. ANALYTICS CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: analytics_events table (partitioned)
- [ ] Migration: daily_kpis table
- [ ] Migration: product_analytics table
- [ ] Migration: channel_analytics table

### Backend
- [ ] AnalyticsEvent entity
- [ ] DailyKPI entity
- [ ] ProductAnalytics entity
- [ ] ChannelAnalytics entity
- [ ] IAnalyticsService interface
- [ ] AnalyticsService implementation

### Tracking Events
- [ ] PageView
- [ ] ProductView
- [ ] AddToCart
- [ ] Purchase
- [ ] Refund
- [ ] Signup
- [ ] Login

### Reports
- [ ] Dashboard metrics
- [ ] Revenue report
- [ ] Customer report
- [ ] Product analytics
- [ ] Channel analytics

### Frontend
- [ ] Analytics dashboard
- [ ] Date range picker
- [ ] Charts (revenue, products, channels)
- [ ] Export reports

### Scheduled Jobs
- [ ] Daily KPI aggregation (Hangfire)
- [ ] Product analytics rollup
- [ ] Channel analytics rollup

### Performance
- [ ] Event table partitioned by month
- [ ] Aggregated tables for reporting
- [ ] Caching for common reports
```

---

**Analytics & Reporting System Completo ✅**
