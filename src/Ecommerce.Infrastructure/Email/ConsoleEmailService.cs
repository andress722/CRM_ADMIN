using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Email;

public class ConsoleEmailService : IEmailService
{
    private readonly ILogger<ConsoleEmailService> _logger;
    private readonly IEmailLogRepository _logs;

    public ConsoleEmailService(ILogger<ConsoleEmailService> logger, IEmailLogRepository logs)
    {
        _logger = logger;
        _logs = logs;
    }

    public Task SendEmailVerificationAsync(string to, string token)
    {
        _logger.LogInformation("[Email] Verification for {Email}: {Token}", to, token);
        return _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = "Email Verification",
            Body = $"Verification token: {token}",
            Status = "Sent",
            CreatedAt = DateTime.UtcNow
        });
    }

    public Task SendPasswordResetAsync(string to, string token)
    {
        _logger.LogInformation("[Email] Password reset for {Email}: {Token}", to, token);
        return _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = "Password Reset",
            Body = $"Reset token: {token}",
            Status = "Sent",
            CreatedAt = DateTime.UtcNow
        });
    }
}
