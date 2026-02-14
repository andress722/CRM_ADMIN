using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IWebhookDeliveryRepository
{
    Task AddAsync(WebhookDelivery delivery);
    Task UpdateAsync(WebhookDelivery delivery);
    Task<IEnumerable<WebhookDelivery>> GetPendingAsync(DateTime now, int take);
}
