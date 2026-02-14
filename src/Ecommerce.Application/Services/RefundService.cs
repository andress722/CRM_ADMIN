using System.Text.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class RefundService
{
    private readonly IRefundRepository _refunds;
    private readonly IChargebackDisputeRepository _disputes;
    private readonly IPaymentRepository _payments;
    private readonly IPaymentGateway _gateway;

    public RefundService(
        IRefundRepository refunds,
        IChargebackDisputeRepository disputes,
        IPaymentRepository payments,
        IPaymentGateway gateway)
    {
        _refunds = refunds;
        _disputes = disputes;
        _payments = payments;
        _gateway = gateway;
    }

    public async Task<Refund> CreateAsync(Guid orderId, decimal amount, string reason)
    {
        var refund = new Refund
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Amount = amount,
            Status = "Pending",
            Reason = reason,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _refunds.AddAsync(refund);
        return refund;
    }

    public async Task<IEnumerable<Refund>> GetAllAsync()
        => await _refunds.GetAllAsync();

    public async Task<Refund?> GetByIdAsync(Guid id)
        => await _refunds.GetByIdAsync(id);

    public async Task<Refund?> ApproveAsync(Guid id)
    {
        var refund = await _refunds.GetByIdAsync(id);
        if (refund == null)
        {
            return null;
        }

        refund.Status = "Approved";
        refund.UpdatedAt = DateTime.UtcNow;
        await _refunds.UpdateAsync(refund);
        return refund;
    }

    public async Task<Refund?> DenyAsync(Guid id)
    {
        var refund = await _refunds.GetByIdAsync(id);
        if (refund == null)
        {
            return null;
        }

        refund.Status = "Denied";
        refund.UpdatedAt = DateTime.UtcNow;
        await _refunds.UpdateAsync(refund);
        return refund;
    }

    public async Task<Refund?> ProcessAsync(Guid id)
    {
        var refund = await _refunds.GetByIdAsync(id);
        if (refund == null)
        {
            return null;
        }

        if (!string.Equals(refund.Status, "Approved", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Refund must be approved before processing");
        }

        var payment = await _payments.GetByOrderIdAsync(refund.OrderId);
        if (payment == null)
        {
            throw new InvalidOperationException("Payment not found for order");
        }

        if (string.IsNullOrWhiteSpace(payment.TransactionId))
        {
            throw new InvalidOperationException("Payment transaction id is missing");
        }

        refund.Status = "Processing";
        refund.UpdatedAt = DateTime.UtcNow;
        await _refunds.UpdateAsync(refund);

        var result = await _gateway.RefundPaymentAsync(payment.TransactionId, refund.Amount);
        if (result == null)
        {
            refund.Status = "Failed";
        }
        else
        {
            refund.Status = result.Status.Equals("refunded", StringComparison.OrdinalIgnoreCase)
                ? "Completed"
                : "Failed";
        }

        if (string.Equals(refund.Status, "Completed", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Refunded;
            await _payments.UpdateAsync(payment);
        }

        refund.UpdatedAt = DateTime.UtcNow;
        await _refunds.UpdateAsync(refund);
        return refund;
    }

    public async Task<ChargebackDispute> DisputeAsync(Guid chargebackId, object payload)
    {
        var dispute = new ChargebackDispute
        {
            Id = Guid.NewGuid(),
            ChargebackId = chargebackId,
            Payload = JsonSerializer.Serialize(payload),
            Status = "Submitted",
            CreatedAt = DateTime.UtcNow
        };

        await _disputes.AddAsync(dispute);
        return dispute;
    }
}
