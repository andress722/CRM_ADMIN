using System.Net;
using System.Net.Mail;
using System.Text;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Email;

public class GmailSmtpEmailService : IEmailService
{
    private readonly ILogger<GmailSmtpEmailService> _logger;
    private readonly IEmailLogRepository _logs;
    private readonly IConfiguration _configuration;

    public GmailSmtpEmailService(
        ILogger<GmailSmtpEmailService> logger,
        IEmailLogRepository logs,
        IConfiguration configuration)
    {
        _logger = logger;
        _logs = logs;
        _configuration = configuration;
    }

    public Task SendEmailVerificationAsync(string to, string token)
    {
        var subject = "Email Verification";
        var (html, text) = BuildVerificationBody(token);
        return SendAsync(to, subject, html, text);
    }

    public Task SendPasswordResetAsync(string to, string token)
    {
        var subject = "Password Reset";
        var (html, text) = BuildPasswordResetBody(token);
        return SendAsync(to, subject, html, text);
    }

    private async Task SendAsync(string to, string subject, string html, string text)
    {
        var user = _configuration["Email:Gmail:User"] ?? string.Empty;
        var pass = (_configuration["Email:Gmail:Pass"] ?? string.Empty).Replace(" ", string.Empty);
        var host = _configuration["Email:Gmail:Host"] ?? "smtp.gmail.com";
        var port = _configuration.GetValue("Email:Gmail:Port", 587);
        var enableSsl = _configuration.GetValue("Email:Gmail:EnableSsl", true);

        var fromEmail = _configuration["Email:FromEmail"] ?? user;
        var fromName = _configuration["Email:FromName"] ?? "Ecommerce";

        string status;
        string responseBody;

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                Body = text,
                IsBodyHtml = false
            };
            message.To.Add(to);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(user, pass)
            };

            await client.SendMailAsync(message);
            status = "Sent";
            responseBody = "Sent";
        }
        catch (Exception ex)
        {
            status = "Failed";
            responseBody = ex.Message;
            _logger.LogError(ex, "Gmail SMTP send failed");
        }

        await _logs.AddAsync(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = to,
            Subject = subject,
            Body = html,
            Status = status,
            CreatedAt = DateTime.UtcNow
        });
    }

    private (string html, string text) BuildVerificationBody(string token)
    {
        var baseUrl = _configuration["Email:BaseUrl"] ?? "http://localhost:3000";
        var verifyUrl = $"{baseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(token)}";

        var text = new StringBuilder()
            .AppendLine("Verify your email:")
            .AppendLine(verifyUrl)
            .ToString();

        var html = $"""
            <div style='font-family:Arial,sans-serif'>
              <h2>Verify your email</h2>
              <p>Click the button below to verify your email address.</p>
              <p><a href='{WebUtility.HtmlEncode(verifyUrl)}' style='display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px'>Verify Email</a></p>
              <p>If the button doesn't work, use this link:</p>
              <p>{WebUtility.HtmlEncode(verifyUrl)}</p>
            </div>
            """;

        return (html, text);
    }

    private (string html, string text) BuildPasswordResetBody(string token)
    {
        var baseUrl = _configuration["Email:BaseUrl"] ?? "http://localhost:3000";
        var resetUrl = $"{baseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}";

        var text = new StringBuilder()
            .AppendLine("Reset your password:")
            .AppendLine(resetUrl)
            .ToString();

        var html = $"""
            <div style='font-family:Arial,sans-serif'>
              <h2>Reset your password</h2>
              <p>Click the button below to reset your password.</p>
              <p><a href='{WebUtility.HtmlEncode(resetUrl)}' style='display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px'>Reset Password</a></p>
              <p>If the button doesn't work, use this link:</p>
              <p>{WebUtility.HtmlEncode(resetUrl)}</p>
            </div>
            """;

        return (html, text);
    }
}
