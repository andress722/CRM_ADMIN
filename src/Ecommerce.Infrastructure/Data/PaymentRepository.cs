using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class PaymentRepository : IPaymentRepository
{
    private readonly EcommerceDbContext _context;

    public PaymentRepository(EcommerceDbContext context)
        => _context = context;

    public async Task<Payment?> GetByIdAsync(Guid id)
        => await _context.Payments.FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Payment?> GetByOrderIdAsync(Guid orderId)
        => await _context.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId);

    public async Task<Payment?> GetByTransactionIdAsync(string transactionId)
        => await _context.Payments.FirstOrDefaultAsync(p => p.TransactionId == transactionId);

    public async Task<IEnumerable<Payment>> GetAllAsync()
        => await _context.Payments.ToListAsync();

    public async Task AddAsync(Payment payment)
    {
        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Payment payment)
    {
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();
    }
}
