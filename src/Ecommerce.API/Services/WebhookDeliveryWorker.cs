using System.Net.Http.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.API.Services;

public class WebhookDeliveryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookDeliveryWorker> _logger;

    public WebhookDeliveryWorker(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookDeliveryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var deliveriesRepo = scope.ServiceProvider.GetRequiredService<IWebhookDeliveryRepository>();
                var webhooksRepo = scope.ServiceProvider.GetRequiredService<IWebhookRepository>();
                var service = scope.ServiceProvider.GetRequiredService<WebhookService>();

                var pending = await deliveriesRepo.GetPendingAsync(DateTime.UtcNow, 25);
                foreach (var delivery in pending)
                {
                    var webhook = await webhooksRepo.GetByIdAsync(delivery.WebhookId);
                    if (webhook == null || !webhook.IsActive)
                    {
                        delivery.Status = "Failed";
                        await deliveriesRepo.UpdateAsync(delivery);
                        continue;
                    }

                    try
                    {
                        var client = _httpClientFactory.CreateClient();
                        var signature = service.SignPayload(webhook.Secret, delivery.Payload);
                        var request = new HttpRequestMessage(HttpMethod.Post, webhook.Url)
                        {
                            Content = JsonContent.Create(new { eventType = delivery.EventType, payload = delivery.Payload })
                        };
                        request.Headers.Add("X-Signature", signature);

                        var response = await client.SendAsync(request, stoppingToken);
                        delivery.ResponseCode = (int)response.StatusCode;
                        delivery.ResponseBody = await response.Content.ReadAsStringAsync(stoppingToken);
                        delivery.Status = response.IsSuccessStatusCode ? "Success" : "Pending";
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Webhook delivery failed");
                        delivery.Status = "Pending";
                    }

                    delivery.Attempt += 1;
                    if (delivery.Status == "Pending")
                    {
                        delivery.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Min(60, 2 * delivery.Attempt));
                    }

                    await deliveriesRepo.UpdateAsync(delivery);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Webhook delivery cycle failed");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
