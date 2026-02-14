namespace Ecommerce.Application.Services;

public class DashboardStatistics
{
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public int PendingOrders { get; set; }
    public int CompletedOrders { get; set; }
    public decimal AverageOrderValue { get; set; }
}

public class SalesStatistics
{
    public decimal TotalSales { get; set; }
    public int OrderCount { get; set; }
    public decimal AverageOrderValue { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public class TopProductStatistic
{
    public Guid ProductId { get; set; }
    public int TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class TopCategoryStatistic
{
    public string? Category { get; set; }
    public int TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class RevenueStatistics
{
    public decimal TotalRevenue { get; set; }
    public int OrderCount { get; set; }
    public decimal AverageOrderValue { get; set; }
}
