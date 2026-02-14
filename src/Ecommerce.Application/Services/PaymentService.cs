using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class PaymentService
{
    private readonly IPaymentRepository _repository;
    private readonly IOrderRepository _orderRepository;
    private readonly IPaymentGateway _gateway;

    public PaymentService(IPaymentRepository repository, IOrderRepository orderRepository, IPaymentGateway gateway)
    {
        _repository = repository;
        _orderRepository = orderRepository;
        _gateway = gateway;
    }

    public async Task<Payment> GetPaymentAsync(Guid id)
    {
        var payment = await _repository.GetByIdAsync(id);
        if (payment == null)
            throw new KeyNotFoundException($"Payment with ID {id} not found");
        return payment;
    }

    public async Task<Payment> GetOrderPaymentAsync(Guid orderId)
    {
        var payment = await _repository.GetByOrderIdAsync(orderId);
        if (payment == null)
            throw new KeyNotFoundException($"Payment for order {orderId} not found");
        return payment;
    }

    public async Task<Payment> CreatePaymentAsync(Guid orderId, PaymentMethod method, decimal amount)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {orderId} not found");

        if (Math.Abs(amount - order.TotalAmount) > 0.01m)
            throw new InvalidOperationException("Payment amount does not match order total");

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Method = method,
            Status = PaymentStatus.Pending,
            Amount = amount,
            CreatedAt = DateTime.UtcNow,
            TransactionId = string.Empty
        };

        await _repository.AddAsync(payment);
        return payment;
    }

    public async Task<Payment> AuthorizePaymentAsync(Guid id, string transactionId)
    {
        var payment = await GetPaymentAsync(id);
        var gatewayPayment = await _gateway.GetPaymentAsync(transactionId);
        if (gatewayPayment == null)
        {
            throw new InvalidOperationException("Transaction not found in payment gateway");
        }

        if (gatewayPayment.Amount > 0 && Math.Abs(gatewayPayment.Amount - payment.Amount) > 0.01m)
        {
            throw new InvalidOperationException("Gateway amount does not match payment amount");
        }

        payment.Status = MapStatus(gatewayPayment.Status);
        payment.TransactionId = transactionId;
        if (payment.Status == PaymentStatus.Captured)
        {
            payment.ProcessedAt = DateTime.UtcNow;
        }

        await _repository.UpdateAsync(payment);

        if (payment.Status == PaymentStatus.Captured)
        {
            var order = await _orderRepository.GetByIdAsync(payment.OrderId);
            if (order != null)
            {
                order.Status = OrderStatus.Confirmed;
                await _orderRepository.UpdateAsync(order);
            }
        }

        return payment;
    }

    public async Task<Payment> CapturePaymentAsync(Guid id)
    {
        var payment = await GetPaymentAsync(id);
        if (payment.Status != PaymentStatus.Authorized)
            throw new InvalidOperationException("Payment must be authorized before capture");

        if (string.IsNullOrWhiteSpace(payment.TransactionId))
            throw new InvalidOperationException("Payment transaction id is missing");

        var gatewayPayment = await _gateway.CapturePaymentAsync(payment.TransactionId);
        if (gatewayPayment == null)
            throw new InvalidOperationException("Capture failed in payment gateway");

        payment.Status = MapStatus(gatewayPayment.Status);
        if (payment.Status == PaymentStatus.Captured)
        {
            payment.ProcessedAt = DateTime.UtcNow;
        }

        await _repository.UpdateAsync(payment);

        if (payment.Status == PaymentStatus.Captured)
        {
            var order = await _orderRepository.GetByIdAsync(payment.OrderId);
            if (order != null)
            {
                order.Status = OrderStatus.Confirmed;
                await _orderRepository.UpdateAsync(order);
            }
        }

        return payment;
    }

    public async Task<bool> ProcessGatewayNotificationAsync(string transactionId)
    {
        var gatewayPayment = await _gateway.GetPaymentAsync(transactionId);
        if (gatewayPayment == null)
        {
            return false;
        }

        var payment = await _repository.GetByTransactionIdAsync(transactionId);
        if (payment == null && Guid.TryParse(gatewayPayment.ExternalReference, out var paymentId))
        {
            payment = await _repository.GetByIdAsync(paymentId);
        }

        if (payment == null)
        {
            return false;
        }

        var newStatus = MapStatus(gatewayPayment.Status);
        if (payment.Status == newStatus)
        {
            if (newStatus == PaymentStatus.Captured && payment.ProcessedAt == null)
            {
                payment.ProcessedAt = DateTime.UtcNow;
                await _repository.UpdateAsync(payment);
            }

            return true;
        }

        payment.Status = newStatus;
        if (payment.Status == PaymentStatus.Captured)
        {
            payment.ProcessedAt = DateTime.UtcNow;
        }

        await _repository.UpdateAsync(payment);

        if (payment.Status == PaymentStatus.Captured)
        {
            var order = await _orderRepository.GetByIdAsync(payment.OrderId);
            if (order != null)
            {
                order.Status = OrderStatus.Confirmed;
                await _orderRepository.UpdateAsync(order);
            }
        }

        return true;
    }

    public async Task<(Payment payment, CheckoutPreferenceResult preference)> CreateCheckoutAsync(
        Guid orderId,
        string? payerEmail,
        string currency,
        string? webhookUrl)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            throw new KeyNotFoundException($"Order with ID {orderId} not found");
        }

        var existingPayment = await _repository.GetByOrderIdAsync(orderId);
        var payment = existingPayment ?? new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Method = PaymentMethod.CreditCard,
            Status = PaymentStatus.Pending,
            Amount = order.TotalAmount,
            CreatedAt = DateTime.UtcNow,
            TransactionId = string.Empty
        };

        if (existingPayment == null)
        {
            await _repository.AddAsync(payment);
        }

        var items = order.Items.Select(item => new PaymentGatewayPreferenceItem(
            $"Item {item.ProductId}",
            item.Quantity,
            item.UnitPrice));

        var preferenceRequest = new PaymentGatewayPreferenceRequest(
            payment.Id,
            order.Id,
            items,
            currency,
            payerEmail,
            webhookUrl);

        var preference = await _gateway.CreatePreferenceAsync(preferenceRequest);
        if (preference == null)
        {
            throw new InvalidOperationException("Failed to create checkout preference");
        }

        if (!string.IsNullOrWhiteSpace(preference.PreferenceId))
        {
            payment.TransactionId = preference.PreferenceId;
            await _repository.UpdateAsync(payment);
        }

        return (payment, preference);
    }

    public async Task<(Payment payment, PaymentGatewayPaymentResult result)> CreateTransparentPaymentAsync(
        Guid orderId,
        string currency,
        string? webhookUrl,
        PaymentGatewayPaymentRequest request)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            throw new KeyNotFoundException($"Order with ID {orderId} not found");
        }

        if (request.Amount > 0 && Math.Abs(request.Amount - order.TotalAmount) > 0.01m)
        {
            throw new InvalidOperationException("Payment amount does not match order total");
        }

        var totalAmount = order.TotalAmount;

        var existingPayment = await _repository.GetByOrderIdAsync(orderId);
        var payment = existingPayment ?? new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Method = MapMethod(request.PaymentMethod),
            Status = PaymentStatus.Pending,
            Amount = totalAmount,
            CreatedAt = DateTime.UtcNow,
            TransactionId = string.Empty
        };

        if (existingPayment == null)
        {
            await _repository.AddAsync(payment);
        }

        var gatewayRequest = request with
        {
            PaymentId = payment.Id,
            OrderId = orderId,
            Amount = totalAmount,
            Currency = currency,
            WebhookUrl = webhookUrl
        };

        var result = await _gateway.CreatePaymentAsync(gatewayRequest);
        if (result == null)
        {
            throw new InvalidOperationException("Failed to create payment in gateway");
        }

        payment.TransactionId = result.TransactionId;
        payment.Status = MapStatus(result.Status);
        if (payment.Status == PaymentStatus.Captured)
        {
            payment.ProcessedAt = DateTime.UtcNow;
        }

        await _repository.UpdateAsync(payment);

        if (payment.Status == PaymentStatus.Captured)
        {
            order.Status = OrderStatus.Confirmed;
            await _orderRepository.UpdateAsync(order);
        }

        return (payment, result);
    }

    private static PaymentStatus MapStatus(string status)
        => status.ToLowerInvariant() switch
        {
            "approved" => PaymentStatus.Captured,
            "authorized" => PaymentStatus.Authorized,
            "in_process" => PaymentStatus.Pending,
            "pending" => PaymentStatus.Pending,
            "rejected" => PaymentStatus.Failed,
            "cancelled" => PaymentStatus.Failed,
            "refunded" => PaymentStatus.Refunded,
            "charged_back" => PaymentStatus.Refunded,
            _ => PaymentStatus.Pending
        };

    private static PaymentMethod MapMethod(string method)
        => method.ToLowerInvariant() switch
        {
            "pix" => PaymentMethod.Pix,
            "boleto" => PaymentMethod.Boleto,
            "card" => PaymentMethod.CreditCard,
            _ => PaymentMethod.CreditCard
        };
}
