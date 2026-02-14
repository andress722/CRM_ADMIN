using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IEmailLogRepository
{
    Task AddAsync(EmailLog log);
    Task<IEnumerable<EmailLog>> GetRecentAsync(int take);
}
