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
        _logger.LogInformation("[Email] Verification requested for {Email} (token redacted)", to);
        return _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = "Email Verification",
            Body = "Verification token: [REDACTED]",
            Status = "Sent",
            CreatedAt = DateTime.UtcNow
        });
    }

    public Task SendPasswordResetAsync(string to, string token)
    {
        _logger.LogInformation("[Email] Password reset requested for {Email} (token redacted)", to);
        return _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = "Password Reset",
            Body = "Reset token: [REDACTED]",
            Status = "Sent",
            CreatedAt = DateTime.UtcNow
        });
    }

    public Task SendCustomEmailAsync(string to, string subject, string htmlBody, string textBody)
    {
        _logger.LogInformation("[Email] Custom email requested for {Email} with subject {Subject}", to, subject);
        return _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = subject,
            Body = htmlBody,
            Status = "Sent",
            CreatedAt = DateTime.UtcNow
        });
    }
}
