using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class SupportService
{
    private readonly ISupportTicketRepository _repository;

    public SupportService(ISupportTicketRepository repository)
        => _repository = repository;

    public async Task<SupportTicket> CreateTicketAsync(string email, string subject, string message)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(message))
            throw new ArgumentException("Email, subject, and message are required");

        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            Email = email.Trim(),
            Subject = subject.Trim(),
            Message = message.Trim(),
            Status = "Open",
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(ticket);
        return ticket;
    }

    public async Task<IEnumerable<SupportTicket>> GetTicketsAsync()
        => await _repository.GetAllAsync();

    public async Task<SupportTicket> GetTicketAsync(Guid id)
    {
        var ticket = await _repository.GetByIdAsync(id);
        if (ticket == null)
            throw new KeyNotFoundException("Ticket not found");
        return ticket;
    }

    public async Task<SupportTicket> UpdateStatusAsync(Guid id, string status)
    {
        var ticket = await GetTicketAsync(id);
        ticket.Status = status;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(ticket);
        return ticket;
    }
}
