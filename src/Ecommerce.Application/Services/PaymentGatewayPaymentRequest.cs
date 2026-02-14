namespace Ecommerce.Application.Services;

public record PaymentGatewayPaymentRequest(
    Guid PaymentId,
    Guid OrderId,
    decimal Amount,
    string Currency,
    string PaymentMethod,
    string? PaymentMethodId,
    string? Description,
    string? WebhookUrl,
    PaymentGatewayPayer Payer,
    PaymentGatewayCard? Card
);

public record PaymentGatewayPayer(
    string Email,
    string FirstName,
    string LastName,
    string IdentificationType,
    string IdentificationNumber,
    string? PhoneAreaCode,
    string? PhoneNumber
);

public record PaymentGatewayCard(
    string Token,
    int Installments,
    string PaymentMethodId,
    string? IssuerId
);

public record PaymentGatewayPaymentResult(
    string TransactionId,
    decimal Amount,
    string Status,
    string? StatusDetail,
    string? ExternalReference,
    string? PixQrCode,
    string? PixQrCodeBase64,
    string? BoletoUrl
);
