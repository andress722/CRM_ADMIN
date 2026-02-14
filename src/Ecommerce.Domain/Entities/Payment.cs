namespace Ecommerce.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string TransactionId { get; set; } = string.Empty;
}

public enum PaymentMethod
{
    CreditCard = 0,
    DebitCard = 1,
    Pix = 2,
    BankTransfer = 3,
    Boleto = 4
}

public enum PaymentStatus
{
    Pending = 0,
    Authorized = 1,
    Captured = 2,
    Failed = 3,
    Refunded = 4
}
