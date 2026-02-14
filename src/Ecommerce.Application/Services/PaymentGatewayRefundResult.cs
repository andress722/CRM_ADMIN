namespace Ecommerce.Application.Services;

public record PaymentGatewayRefundResult(
    string RefundId,
    decimal Amount,
    string Status
);
