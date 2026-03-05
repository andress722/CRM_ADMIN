using System.Text;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class AdminReportService
{
    private static readonly HashSet<OrderStatus> SoldStatuses =
    [
        OrderStatus.Confirmed,
        OrderStatus.Processing,
        OrderStatus.Shipped,
        OrderStatus.Delivered
    ];

    private readonly IOrderRepository _orderRepository;
    private readonly ICartRepository _cartRepository;
    private readonly IProductRepository _productRepository;
    private readonly IAnalyticsEventRepository _analyticsEventRepository;
    private readonly UserService _userService;

    public AdminReportService(
        IOrderRepository orderRepository,
        ICartRepository cartRepository,
        IProductRepository productRepository,
        IAnalyticsEventRepository analyticsEventRepository,
        UserService userService)
    {
        _orderRepository = orderRepository;
        _cartRepository = cartRepository;
        _productRepository = productRepository;
        _analyticsEventRepository = analyticsEventRepository;
        _userService = userService;
    }

    public async Task<AdminOverviewReportDto> BuildOverviewAsync(DateTime? nowUtc = null)
    {
        var now = nowUtc ?? DateTime.UtcNow;

        var dailyStart = now.AddDays(-1);
        var weeklyStart = now.AddDays(-7);
        var monthlyStart = now.AddDays(-30);
        var minStart = monthlyStart;

        var orders = (await _orderRepository.GetAllAsync()).ToList();
        var cartItems = (await _cartRepository.GetAllAsync()).ToList();
        var products = (await _productRepository.GetAllAsync()).ToDictionary(p => p.Id);
        var users = (await _userService.GetAllUsersAsync()).ToList();
        var events = (await _analyticsEventRepository.GetSinceAsync(minStart)).ToList();

        return new AdminOverviewReportDto
        {
            GeneratedAt = now,
            Daily = BuildPeriod("daily", dailyStart, now, orders, cartItems, products, users, events),
            Weekly = BuildPeriod("weekly", weeklyStart, now, orders, cartItems, products, users, events),
            Monthly = BuildPeriod("monthly", monthlyStart, now, orders, cartItems, products, users, events)
        };
    }

    public string BuildOverviewEmailHtml(AdminOverviewReportDto report)
    {
        var sb = new StringBuilder();
        sb.Append("<div style='font-family:Arial,sans-serif;color:#0f172a'>");
        sb.Append($"<h2>Relatorio de Performance - {report.GeneratedAt:yyyy-MM-dd HH:mm} UTC</h2>");
        sb.Append("<p>Resumo diario, semanal e mensal com vendas, abandono de carrinho, cancelamentos e comportamento.</p>");

        AppendPeriod(report.Daily);
        AppendPeriod(report.Weekly);
        AppendPeriod(report.Monthly);

        sb.Append("</div>");
        return sb.ToString();

        void AppendPeriod(AdminPeriodReportDto period)
        {
            sb.Append($"<h3 style='margin-top:20px;text-transform:uppercase'>{period.Period}</h3>");
            sb.Append($"<p>Periodo: {period.StartUtc:yyyy-MM-dd HH:mm} ate {period.EndUtc:yyyy-MM-dd HH:mm} UTC</p>");
            sb.Append("<ul>");
            sb.Append($"<li>Receita vendida: {period.SoldRevenue:C}</li>");
            sb.Append($"<li>Pedidos: {period.OrdersPlaced} | Vendidos: {period.OrdersSold} | Cancelados: {period.OrdersCancelled}</li>");
            sb.Append($"<li>Itens vendidos: {period.ProductsSoldQuantity} | Cancelados: {period.ProductsCancelledQuantity}</li>");
            sb.Append($"<li>Carrinho: adicionados {period.CartItemsAdded}, em aberto {period.CartItemsOpen}, abandonados {period.CartItemsAbandoned}</li>");
            sb.Append($"<li>Eventos: visualizacoes {period.ProductViews}, favoritos {period.WishlistAdds}, cadastros {period.Signups}</li>");
            sb.Append($"<li>Taxas: conversao carrinho {period.CartToSaleConversionRate:P2}, abandono {period.CartAbandonRate:P2}, cancelamento {period.CancelRate:P2}</li>");
            sb.Append("</ul>");

            if (period.TopSoldProducts.Count > 0)
            {
                sb.Append("<p><strong>Top vendidos:</strong></p><ol>");
                foreach (var item in period.TopSoldProducts.Take(5))
                {
                    sb.Append($"<li>{System.Net.WebUtility.HtmlEncode(item.ProductName)} - qtd {item.Quantity}, receita {item.Revenue:C}</li>");
                }

                sb.Append("</ol>");
            }

            if (period.Insights.Count > 0)
            {
                sb.Append("<p><strong>Insights:</strong></p><ul>");
                foreach (var insight in period.Insights)
                {
                    sb.Append($"<li>{System.Net.WebUtility.HtmlEncode(insight)}</li>");
                }

                sb.Append("</ul>");
            }
        }
    }

    public string BuildOverviewEmailText(AdminOverviewReportDto report)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Relatorio de Performance - {report.GeneratedAt:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine();
        AppendPeriod(report.Daily);
        AppendPeriod(report.Weekly);
        AppendPeriod(report.Monthly);
        return sb.ToString();

        void AppendPeriod(AdminPeriodReportDto period)
        {
            sb.AppendLine($"[{period.Period.ToUpperInvariant()}] {period.StartUtc:yyyy-MM-dd HH:mm} -> {period.EndUtc:yyyy-MM-dd HH:mm} UTC");
            sb.AppendLine($"Receita vendida: {period.SoldRevenue:C}");
            sb.AppendLine($"Pedidos: {period.OrdersPlaced} | Vendidos: {period.OrdersSold} | Cancelados: {period.OrdersCancelled}");
            sb.AppendLine($"Itens vendidos: {period.ProductsSoldQuantity} | Cancelados: {period.ProductsCancelledQuantity}");
            sb.AppendLine($"Carrinho: adicionados {period.CartItemsAdded}, em aberto {period.CartItemsOpen}, abandonados {period.CartItemsAbandoned}");
            sb.AppendLine($"Eventos: visualizacoes {period.ProductViews}, favoritos {period.WishlistAdds}, cadastros {period.Signups}");
            sb.AppendLine($"Taxas: conversao carrinho {period.CartToSaleConversionRate:P2}, abandono {period.CartAbandonRate:P2}, cancelamento {period.CancelRate:P2}");

            if (period.TopSoldProducts.Count > 0)
            {
                sb.AppendLine("Top vendidos:");
                foreach (var item in period.TopSoldProducts.Take(5))
                {
                    sb.AppendLine($"- {item.ProductName}: qtd {item.Quantity}, receita {item.Revenue:C}");
                }
            }

            if (period.Insights.Count > 0)
            {
                sb.AppendLine("Insights:");
                foreach (var insight in period.Insights)
                {
                    sb.AppendLine($"- {insight}");
                }
            }

            sb.AppendLine();
        }
    }

    private static AdminPeriodReportDto BuildPeriod(
        string period,
        DateTime startUtc,
        DateTime endUtc,
        IReadOnlyCollection<Order> orders,
        IReadOnlyCollection<CartItem> cartItems,
        IReadOnlyDictionary<Guid, Product> products,
        IReadOnlyCollection<User> users,
        IReadOnlyCollection<AnalyticsEvent> events)
    {
        var periodOrders = orders.Where(o => o.CreatedAt >= startUtc && o.CreatedAt < endUtc).ToList();
        var soldOrders = periodOrders.Where(o => SoldStatuses.Contains(o.Status)).ToList();
        var cancelledOrders = periodOrders.Where(o => o.Status == OrderStatus.Cancelled).ToList();

        var soldItems = soldOrders.SelectMany(o => o.Items).ToList();
        var cancelledItems = cancelledOrders.SelectMany(o => o.Items).ToList();

        var periodEvents = events.Where(e => e.CreatedAt >= startUtc && e.CreatedAt < endUtc).ToList();
        var addToCartEvents = periodEvents.Where(e => e.Type.Equals("AddToCart", StringComparison.OrdinalIgnoreCase)).ToList();
        var productViewEvents = periodEvents.Where(e => e.Type.Equals("ProductView", StringComparison.OrdinalIgnoreCase)).ToList();
        var wishlistEvents = periodEvents.Where(e => e.Type.Equals("WishlistAdd", StringComparison.OrdinalIgnoreCase)).ToList();
        var signupsTracked = periodEvents.Count(e => e.Type.Equals("Signup", StringComparison.OrdinalIgnoreCase));

        var usersCreated = users.Count(u => u.CreatedAt >= startUtc && u.CreatedAt < endUtc);
        var signups = Math.Max(signupsTracked, usersCreated);

        var openCartItems = cartItems.Where(c => c.AddedAt >= startUtc && c.AddedAt < endUtc).ToList();
        var abandonedCartItems = openCartItems.Where(c => c.AddedAt <= endUtc.AddHours(-24)).ToList();

        var topSold = BuildRowsFromOrderItems(soldItems, products, 10);
        var topCancelled = BuildRowsFromOrderItems(cancelledItems, products, 10);
        var topCart = BuildRowsFromEvents(addToCartEvents, products, 10);
        var topViewed = BuildRowsFromEvents(productViewEvents, products, 10, countUsesValue: false);
        var topFavorited = BuildRowsFromEvents(wishlistEvents, products, 10, countUsesValue: false);

        var soldRevenue = soldOrders.Sum(o => o.TotalAmount);
        var cartItemsAdded = addToCartEvents.Sum(e => e.Value ?? 1);

        var cartToSaleConversionRate = cartItemsAdded > 0
            ? Math.Min(1m, soldItems.Sum(i => i.Quantity) / cartItemsAdded)
            : 0m;

        var cancelRate = periodOrders.Count > 0
            ? (decimal)cancelledOrders.Count / periodOrders.Count
            : 0m;

        var cartAbandonRate = openCartItems.Count > 0
            ? (decimal)abandonedCartItems.Count / openCartItems.Count
            : 0m;

        return new AdminPeriodReportDto
        {
            Period = period,
            StartUtc = startUtc,
            EndUtc = endUtc,
            OrdersPlaced = periodOrders.Count,
            OrdersSold = soldOrders.Count,
            OrdersCancelled = cancelledOrders.Count,
            SoldRevenue = soldRevenue,
            ProductsSoldQuantity = soldItems.Sum(i => i.Quantity),
            ProductsCancelledQuantity = cancelledItems.Sum(i => i.Quantity),
            CartItemsAdded = cartItemsAdded,
            CartItemsOpen = openCartItems.Sum(i => i.Quantity),
            CartItemsAbandoned = abandonedCartItems.Sum(i => i.Quantity),
            Signups = signups,
            ProductViews = productViewEvents.Count,
            WishlistAdds = wishlistEvents.Count,
            CartToSaleConversionRate = cartToSaleConversionRate,
            CancelRate = cancelRate,
            CartAbandonRate = cartAbandonRate,
            TopSoldProducts = topSold,
            TopAddedToCartProducts = topCart,
            TopCancelledProducts = topCancelled,
            TopViewedProducts = topViewed,
            TopFavoritedProducts = topFavorited,
            Insights = BuildInsights(topSold, topCart, topCancelled, topViewed, cartAbandonRate, cancelRate)
        };
    }

    private static List<AdminReportProductRowDto> BuildRowsFromOrderItems(
        IEnumerable<OrderItem> items,
        IReadOnlyDictionary<Guid, Product> products,
        int take)
    {
        return items
            .GroupBy(i => i.ProductId)
            .Select(g =>
            {
                products.TryGetValue(g.Key, out var product);
                return new AdminReportProductRowDto
                {
                    ProductId = g.Key,
                    ProductName = product?.Name ?? "Produto removido",
                    Category = product?.Category ?? "Unknown",
                    Quantity = g.Sum(x => x.Quantity),
                    Revenue = g.Sum(x => x.Subtotal)
                };
            })
            .OrderByDescending(x => x.Quantity)
            .ThenByDescending(x => x.Revenue)
            .Take(take)
            .ToList();
    }

    private static List<AdminReportProductRowDto> BuildRowsFromEvents(
        IEnumerable<AnalyticsEvent> events,
        IReadOnlyDictionary<Guid, Product> products,
        int take,
        bool countUsesValue = true)
    {
        return events
            .Where(e => Guid.TryParse(e.Label, out _))
            .GroupBy(e => Guid.Parse(e.Label!))
            .Select(g =>
            {
                products.TryGetValue(g.Key, out var product);
                var quantity = countUsesValue
                    ? g.Sum(x => (int)(x.Value ?? 1))
                    : g.Count();

                return new AdminReportProductRowDto
                {
                    ProductId = g.Key,
                    ProductName = product?.Name ?? "Produto removido",
                    Category = product?.Category ?? "Unknown",
                    Quantity = quantity,
                    Revenue = 0
                };
            })
            .OrderByDescending(x => x.Quantity)
            .Take(take)
            .ToList();
    }

    private static List<string> BuildInsights(
        IReadOnlyList<AdminReportProductRowDto> topSold,
        IReadOnlyList<AdminReportProductRowDto> topCart,
        IReadOnlyList<AdminReportProductRowDto> topCancelled,
        IReadOnlyList<AdminReportProductRowDto> topViewed,
        decimal cartAbandonRate,
        decimal cancelRate)
    {
        var insights = new List<string>();

        if (cartAbandonRate > 0.4m)
        {
            insights.Add("Taxa de abandono de carrinho alta. Priorizar fluxo de recuperacao e oferta de frete/cupom.");
        }

        if (cancelRate > 0.2m)
        {
            insights.Add("Taxa de cancelamento elevada. Revisar prazo de entrega, ruptura de estoque e comunicacao de pos-venda.");
        }

        var cartNotSelling = topCart
            .Where(c => topSold.All(s => s.ProductId != c.ProductId))
            .Take(3)
            .ToList();
        if (cartNotSelling.Count > 0)
        {
            insights.Add($"Produtos com alta adicao no carrinho sem venda: {string.Join(", ", cartNotSelling.Select(x => x.ProductName))}.");
        }

        var highlyViewedNotSelling = topViewed
            .Where(v => topSold.All(s => s.ProductId != v.ProductId))
            .Take(3)
            .ToList();
        if (highlyViewedNotSelling.Count > 0)
        {
            insights.Add($"Produtos muito vistos com baixa conversao: {string.Join(", ", highlyViewedNotSelling.Select(x => x.ProductName))}. Considere destaque, prova social e ajuste de preco.");
        }

        var mostCancelled = topCancelled.FirstOrDefault();
        if (mostCancelled is not null)
        {
            insights.Add($"Produto com mais cancelamentos no periodo: {mostCancelled.ProductName}. Validar qualidade/estoque/logistica.");
        }

        return insights;
    }
}

public class AdminOverviewReportDto
{
    public DateTime GeneratedAt { get; set; }
    public AdminPeriodReportDto Daily { get; set; } = new();
    public AdminPeriodReportDto Weekly { get; set; } = new();
    public AdminPeriodReportDto Monthly { get; set; } = new();
}

public class AdminPeriodReportDto
{
    public string Period { get; set; } = string.Empty;
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }

    public int OrdersPlaced { get; set; }
    public int OrdersSold { get; set; }
    public int OrdersCancelled { get; set; }
    public decimal SoldRevenue { get; set; }

    public int ProductsSoldQuantity { get; set; }
    public int ProductsCancelledQuantity { get; set; }

    public decimal CartItemsAdded { get; set; }
    public int CartItemsOpen { get; set; }
    public int CartItemsAbandoned { get; set; }

    public int Signups { get; set; }
    public int ProductViews { get; set; }
    public int WishlistAdds { get; set; }

    public decimal CartToSaleConversionRate { get; set; }
    public decimal CancelRate { get; set; }
    public decimal CartAbandonRate { get; set; }

    public List<AdminReportProductRowDto> TopSoldProducts { get; set; } = [];
    public List<AdminReportProductRowDto> TopAddedToCartProducts { get; set; } = [];
    public List<AdminReportProductRowDto> TopCancelledProducts { get; set; } = [];
    public List<AdminReportProductRowDto> TopViewedProducts { get; set; } = [];
    public List<AdminReportProductRowDto> TopFavoritedProducts { get; set; } = [];

    public List<string> Insights { get; set; } = [];
}

public class AdminReportProductRowDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Revenue { get; set; }
}
