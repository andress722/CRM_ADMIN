namespace Ecommerce.Application.Services;

public interface IPaymentGateway
{
    Task<PaymentGatewayPaymentResult?> CreatePaymentAsync(PaymentGatewayPaymentRequest request);
    Task<CheckoutPreferenceResult?> CreatePreferenceAsync(PaymentGatewayPreferenceRequest request);
    Task<PaymentGatewayResult?> GetPaymentAsync(string transactionId);
    Task<PaymentGatewayResult?> CapturePaymentAsync(string transactionId);
    Task<PaymentGatewayRefundResult?> RefundPaymentAsync(string transactionId, decimal amount);
}
