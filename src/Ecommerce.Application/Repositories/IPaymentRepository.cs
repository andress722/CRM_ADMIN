using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(Guid id);
    Task<Payment?> GetByOrderIdAsync(Guid orderId);
    Task<Payment?> GetByTransactionIdAsync(string transactionId);
    Task<IEnumerable<Payment>> GetAllAsync();
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);
}
