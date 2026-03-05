using System.Net;
using System.Text;
using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Email;

public class SesEmailService : IEmailService
{
    private readonly ILogger<SesEmailService> _logger;
    private readonly IEmailLogRepository _logs;
    private readonly IConfiguration _configuration;
    private readonly IAmazonSimpleEmailService _sesClient;

    public SesEmailService(
        ILogger<SesEmailService> logger,
        IEmailLogRepository logs,
        IConfiguration configuration)
    {
        _logger = logger;
        _logs = logs;
        _configuration = configuration;

        var regionName = _configuration["Email:Ses:Region"] ?? "us-east-1";
        var region = RegionEndpoint.GetBySystemName(regionName);
        _sesClient = new AmazonSimpleEmailServiceClient(region);
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

    public Task SendCustomEmailAsync(string to, string subject, string htmlBody, string textBody)
        => SendAsync(to, subject, htmlBody, textBody);

    private async Task SendAsync(string to, string subject, string html, string text)
    {
        var fromEmail = _configuration["Email:FromEmail"] ?? "no-reply@ecommerce.local";

        string status;
        string responseBody;

        try
        {
            var request = new SendEmailRequest
            {
                Source = fromEmail,
                Destination = new Destination { ToAddresses = new List<string> { to } },
                Message = new Message
                {
                    Subject = new Content(subject),
                    Body = new Body
                    {
                        Html = new Content(html),
                        Text = new Content(text)
                    }
                }
            };

            var response = await _sesClient.SendEmailAsync(request);
            responseBody = response.MessageId ?? string.Empty;
            status = response.HttpStatusCode == HttpStatusCode.OK ? "Sent" : $"Failed: {(int)response.HttpStatusCode}";

            if (response.HttpStatusCode != HttpStatusCode.OK)
            {
                _logger.LogWarning("SES failed: {Status}", response.HttpStatusCode);
            }
        }
        catch (Exception ex)
        {
            status = "Failed";
            responseBody = ex.Message;
            _logger.LogError(ex, "SES send failed");
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
