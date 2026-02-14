using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class SupportTicketRepository : ISupportTicketRepository
{
    private readonly EcommerceDbContext _context;

    public SupportTicketRepository(EcommerceDbContext context)
        => _context = context;

    public async Task AddAsync(SupportTicket ticket)
    {
        await _context.SupportTickets.AddAsync(ticket);
        await _context.SaveChangesAsync();
    }

    public async Task<SupportTicket?> GetByIdAsync(Guid id)
        => await _context.SupportTickets.FirstOrDefaultAsync(t => t.Id == id);

    public async Task<IEnumerable<SupportTicket>> GetAllAsync()
        => await _context.SupportTickets.OrderByDescending(t => t.CreatedAt).ToListAsync();

    public async Task UpdateAsync(SupportTicket ticket)
    {
        _context.SupportTickets.Update(ticket);
        await _context.SaveChangesAsync();
    }
}
