namespace Ecommerce.Application.Services;

public interface IEmailService
{
    Task SendEmailVerificationAsync(string to, string token);
    Task SendPasswordResetAsync(string to, string token);
    Task SendCustomEmailAsync(string to, string subject, string htmlBody, string textBody);
}
