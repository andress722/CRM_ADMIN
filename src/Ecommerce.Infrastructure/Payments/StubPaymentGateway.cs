using Ecommerce.Application.Services;

namespace Ecommerce.Infrastructure.Payments;

public class StubPaymentGateway : IPaymentGateway
{
    public Task<PaymentGatewayPaymentResult?> CreatePaymentAsync(PaymentGatewayPaymentRequest request)
    {
        var transactionId = $"pay_{request.PaymentId}";
        return Task.FromResult<PaymentGatewayPaymentResult?>(
            new PaymentGatewayPaymentResult(
                transactionId,
                request.Amount,
                "approved",
                null,
                request.PaymentId.ToString(),
                request.PaymentMethod.Equals("pix", StringComparison.OrdinalIgnoreCase) ? "PIX_QR_CODE" : null,
                request.PaymentMethod.Equals("pix", StringComparison.OrdinalIgnoreCase) ? "PIX_QR_BASE64" : null,
                request.PaymentMethod.Equals("boleto", StringComparison.OrdinalIgnoreCase) ? "https://example.com/boleto" : null));
    }

    public Task<CheckoutPreferenceResult?> CreatePreferenceAsync(PaymentGatewayPreferenceRequest request)
    {
        return Task.FromResult<CheckoutPreferenceResult?>(
            new CheckoutPreferenceResult($"pref_{request.PaymentId}", "https://example.com/checkout", null));
    }

    public Task<PaymentGatewayResult?> GetPaymentAsync(string transactionId)
    {
        return Task.FromResult<PaymentGatewayResult?>(new PaymentGatewayResult(transactionId, 0m, "approved", null));
    }

    public Task<PaymentGatewayResult?> CapturePaymentAsync(string transactionId)
    {
        return Task.FromResult<PaymentGatewayResult?>(new PaymentGatewayResult(transactionId, 0m, "approved", null));
    }

    public Task<PaymentGatewayRefundResult?> RefundPaymentAsync(string transactionId, decimal amount)
    {
        return Task.FromResult<PaymentGatewayRefundResult?>(
            new PaymentGatewayRefundResult($"refund_{transactionId}", amount, "refunded"));
    }
}
