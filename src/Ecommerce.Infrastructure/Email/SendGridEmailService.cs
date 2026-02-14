using System.Net;
using System.Text;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Ecommerce.Infrastructure.Email;

public class SendGridEmailService : IEmailService
{
    private readonly ILogger<SendGridEmailService> _logger;
    private readonly IEmailLogRepository _logs;
    private readonly IConfiguration _configuration;
    private readonly SendGridClient _client;

    public SendGridEmailService(
        ILogger<SendGridEmailService> logger,
        IEmailLogRepository logs,
        IConfiguration configuration)
    {
        _logger = logger;
        _logs = logs;
        _configuration = configuration;

        var apiKey = _configuration["Email:SendGrid:ApiKey"] ?? string.Empty;
        _client = new SendGridClient(apiKey);
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
        var fromEmail = _configuration["Email:FromEmail"] ?? "no-reply@ecommerce.local";
        var fromName = _configuration["Email:FromName"] ?? "Ecommerce";

        var from = new EmailAddress(fromEmail, fromName);
        var toAddress = new EmailAddress(to);
        var message = MailHelper.CreateSingleEmail(from, toAddress, subject, text, html);

        string status;
        string responseBody;

        try
        {
            var response = await _client.SendEmailAsync(message);
            responseBody = await response.Body.ReadAsStringAsync();
            status = response.IsSuccessStatusCode ? "Sent" : $"Failed: {(int)response.StatusCode}";

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("SendGrid failed: {Status} - {Body}", response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            status = "Failed";
            responseBody = ex.Message;
            _logger.LogError(ex, "SendGrid send failed");
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
