namespace Ecommerce.Application.Services;

public record PaymentGatewayResult(
    string TransactionId,
    decimal Amount,
    string Status,
    string? ExternalReference
);
