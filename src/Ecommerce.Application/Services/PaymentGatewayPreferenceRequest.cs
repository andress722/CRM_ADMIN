namespace Ecommerce.Application.Services;

public record PaymentGatewayPreferenceRequest(
    Guid PaymentId,
    Guid OrderId,
    IEnumerable<PaymentGatewayPreferenceItem> Items,
    string Currency,
    string? PayerEmail,
    string? WebhookUrl
);

public record PaymentGatewayPreferenceItem(
    string Title,
    int Quantity,
    decimal UnitPrice
);

public record CheckoutPreferenceResult(
    string PreferenceId,
    string? InitPoint,
    string? SandboxInitPoint
);
