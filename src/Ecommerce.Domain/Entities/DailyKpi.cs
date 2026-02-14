namespace Ecommerce.Domain.Entities;

public class DailyKpi
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public int TotalEvents { get; set; }
    public int Signups { get; set; }
    public int Logins { get; set; }
    public int Purchases { get; set; }
    public DateTime CreatedAt { get; set; }
}
