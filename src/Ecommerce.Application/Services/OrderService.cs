using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class OrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICartRepository _cartRepository;
    private readonly ICouponRepository _couponRepository;

    public OrderService(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        ICartRepository cartRepository,
        ICouponRepository couponRepository)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _cartRepository = cartRepository;
        _couponRepository = couponRepository;
    }

    public async Task<Order> GetOrderAsync(Guid id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {id} not found");
        return order;
    }

    public async Task<IEnumerable<Order>> GetUserOrdersAsync(Guid userId)
        => await _orderRepository.GetByUserIdAsync(userId);

    public async Task<Order> CreateOrderAsync(Guid userId, List<(Guid ProductId, int Quantity)> items)
    {
        if (!items.Any())
            throw new InvalidOperationException("Order must have at least one item");

        var groupedItems = items
            .Where(item => item.ProductId != Guid.Empty && item.Quantity > 0)
            .GroupBy(item => item.ProductId)
            .Select(group => (ProductId: group.Key, Quantity: group.Sum(item => item.Quantity)))
            .ToList();

        if (!groupedItems.Any())
            throw new InvalidOperationException("Order has no valid items");

        var productsById = new Dictionary<Guid, Product>();
        foreach (var item in groupedItems)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId);
            if (product == null)
                throw new KeyNotFoundException($"Product with ID {item.ProductId} not found");

            if (!product.IsActive)
                throw new InvalidOperationException($"Product {product.Name} is inactive");

            if (product.Stock < item.Quantity)
                throw new InvalidOperationException($"Insufficient stock for product {product.Name}");

            productsById[item.ProductId] = product;
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        decimal totalAmount = 0;

        foreach (var item in groupedItems)
        {
            var product = productsById[item.ProductId];
            var orderItem = new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = product.Price,
                Subtotal = product.Price * item.Quantity
            };

            order.Items.Add(orderItem);
            totalAmount += orderItem.Subtotal;
        }

        foreach (var item in groupedItems)
        {
            var product = productsById[item.ProductId];
            product.Stock -= item.Quantity;
            await _productRepository.UpdateAsync(product);
        }

        order.TotalAmount = totalAmount;
        await _orderRepository.AddAsync(order);
        await _cartRepository.ClearUserCartAsync(userId);

        return order;
    }

    public async Task<Order> CreateOrderFromCartAsync(Guid userId, string? couponCode = null)
    {
        var cartItems = (await _cartRepository.GetByUserIdAsync(userId)).ToList();
        if (!cartItems.Any())
        {
            throw new InvalidOperationException("Cart is empty");
        }

        var validItems = cartItems
            .Where(item => item.ProductId != Guid.Empty && item.Quantity > 0)
            .Select(item => (item.ProductId, item.Quantity))
            .ToList();

        if (!validItems.Any())
        {
            throw new InvalidOperationException("Cart has no valid items");
        }

        var discountPercent = await ResolveCouponDiscountAsync(couponCode);
        var order = await CreateOrderAsync(userId, validItems);

        if (discountPercent <= 0)
        {
            return order;
        }

        var discountMultiplier = (100m - discountPercent) / 100m;
        order.TotalAmount = Math.Round(order.TotalAmount * discountMultiplier, 2, MidpointRounding.AwayFromZero);
        order.UpdatedAt = DateTime.UtcNow;
        await _orderRepository.UpdateAsync(order);

        return order;
    }

    private async Task<decimal> ResolveCouponDiscountAsync(string? couponCode)
    {
        var normalizedCode = (couponCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return 0m;
        }

        var coupon = (await _couponRepository.GetAllAsync())
            .FirstOrDefault(c =>
                c.Active &&
                c.Code.Trim().ToUpperInvariant() == normalizedCode);

        if (coupon == null)
        {
            throw new InvalidOperationException("Invalid or inactive coupon");
        }

        return Math.Clamp(coupon.Discount, 0m, 100m);
    }

    public async Task<Order> UpdateOrderStatusAsync(Guid id, OrderStatus status)
    {
        var order = await GetOrderAsync(id);
        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;

        await _orderRepository.UpdateAsync(order);
        return order;
    }

    public async Task<IEnumerable<Order>> GetAllOrdersAsync()
    {
        return await _orderRepository.GetAllAsync();
    }

    public async Task<IEnumerable<Order>> GetOrdersByStatusAsync(OrderStatus status)
    {
        var allOrders = await _orderRepository.GetAllAsync();
        return allOrders.Where(o => o.Status == status);
    }

    public async Task<DashboardStatistics> GetDashboardStatisticsAsync()
    {
        var orders = await _orderRepository.GetAllAsync();
        var confirmedOrders = orders.Where(o => o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Delivered);

        return new DashboardStatistics
        {
            TotalOrders = orders.Count(),
            TotalRevenue = confirmedOrders.Sum(o => o.TotalAmount),
            PendingOrders = orders.Count(o => o.Status == OrderStatus.Pending),
            CompletedOrders = orders.Count(o => o.Status == OrderStatus.Delivered),
            AverageOrderValue = confirmedOrders.Any() ? confirmedOrders.Average(o => o.TotalAmount) : 0
        };
    }

    public async Task<SalesStatistics> GetSalesStatisticsAsync(DateTime startDate, DateTime endDate)
    {
        var orders = await _orderRepository.GetAllAsync();
        var periodOrders = orders.Where(o => o.CreatedAt.Date >= startDate.Date && o.CreatedAt.Date <= endDate.Date);

        return new SalesStatistics
        {
            TotalSales = periodOrders.Sum(o => o.TotalAmount),
            OrderCount = periodOrders.Count(),
            AverageOrderValue = periodOrders.Any() ? periodOrders.Average(o => o.TotalAmount) : 0,
            StartDate = startDate,
            EndDate = endDate
        };
    }

    public async Task<IEnumerable<TopProductStatistic>> GetTopProductsAsync(int limit)
    {
        var orders = await _orderRepository.GetAllAsync();
        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(oi => oi.ProductId)
            .OrderByDescending(g => g.Sum(oi => oi.Quantity))
            .Take(limit)
            .Select(g => new TopProductStatistic
            {
                ProductId = g.Key,
                TotalQuantitySold = g.Sum(oi => oi.Quantity),
                TotalRevenue = g.Sum(oi => oi.Subtotal)
            });

        return topProducts;
    }

    public async Task<IEnumerable<TopCategoryStatistic>> GetTopCategoriesAsync()
    {
        var orders = await _orderRepository.GetAllAsync();
        var topCategories = orders
            .SelectMany(o => o.Items)
            .GroupBy(oi => oi.ProductId)
            .GroupBy(g =>
            {
                var product = _productRepository.GetByIdAsync(g.Key).Result;
                return product?.Category ?? "Unknown";
            })
            .Select(g => new TopCategoryStatistic
            {
                Category = g.Key,
                TotalQuantitySold = g.Sum(items => items.Sum(i => i.Quantity)),
                TotalRevenue = g.Sum(items => items.Sum(i => i.Subtotal))
            })
            .OrderByDescending(c => c.TotalRevenue)
            .ToList();

        return topCategories;
    }

    public async Task<RevenueStatistics> GetRevenueStatisticsAsync(DateTime? startDate, DateTime? endDate)
    {
        var orders = await _orderRepository.GetAllAsync();
        var confirmedOrders = orders.Where(o => o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Delivered);

        if (startDate.HasValue)
            confirmedOrders = confirmedOrders.Where(o => o.CreatedAt.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            confirmedOrders = confirmedOrders.Where(o => o.CreatedAt.Date <= endDate.Value.Date);

        return new RevenueStatistics
        {
            TotalRevenue = confirmedOrders.Sum(o => o.TotalAmount),
            OrderCount = confirmedOrders.Count(),
            AverageOrderValue = confirmedOrders.Any() ? confirmedOrders.Average(o => o.TotalAmount) : 0
        };
    }
}
