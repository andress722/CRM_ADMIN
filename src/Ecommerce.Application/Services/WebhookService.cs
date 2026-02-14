using System.Security.Cryptography;
using System.Text;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class WebhookService
{
    private readonly IWebhookRepository _webhooks;
    private readonly IWebhookDeliveryRepository _deliveries;

    public WebhookService(IWebhookRepository webhooks, IWebhookDeliveryRepository deliveries)
    {
        _webhooks = webhooks;
        _deliveries = deliveries;
    }

    public async Task<IEnumerable<Webhook>> GetAllAsync() => await _webhooks.GetAllAsync();

    public async Task<Webhook> CreateAsync(string url, IEnumerable<string> events)
    {
        var webhook = new Webhook
        {
            Id = Guid.NewGuid(),
            Url = url,
            Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
            EventTypes = string.Join(',', events),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _webhooks.AddAsync(webhook);
        return webhook;
    }

    public async Task DeleteAsync(Guid id) => await _webhooks.DeleteAsync(id);

    public async Task PublishAsync(string eventType, string payload)
    {
        var hooks = await _webhooks.GetAllAsync();
        foreach (var hook in hooks.Where(h => h.IsActive))
        {
            if (!IsSubscribed(hook, eventType))
            {
                continue;
            }

            var delivery = new WebhookDelivery
            {
                Id = Guid.NewGuid(),
                WebhookId = hook.Id,
                EventType = eventType,
                Payload = payload,
                Attempt = 0,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            await _deliveries.AddAsync(delivery);
        }
    }

    public string SignPayload(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public bool ValidateSignature(string secret, string payload, string signature)
    {
        var expected = SignPayload(secret, payload);
        return string.Equals(expected, signature, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSubscribed(Webhook webhook, string eventType)
    {
        var tokens = webhook.EventTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return tokens.Contains(eventType, StringComparer.OrdinalIgnoreCase);
    }
}
