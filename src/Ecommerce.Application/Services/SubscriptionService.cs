using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class SubscriptionService
{
    private readonly ISubscriptionRepository _repository;

    public SubscriptionService(ISubscriptionRepository repository)
        => _repository = repository;

    public async Task<Subscription> CreateSubscriptionAsync(string plan, string email)
    {
        if (string.IsNullOrWhiteSpace(plan) || string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Plan and email are required");

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            Plan = plan.Trim(),
            Email = email.Trim(),
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            LastBilledAt = DateTime.UtcNow,
            NextBillingAt = DateTime.UtcNow.AddMonths(1)
        };

        await _repository.AddAsync(subscription);
        return subscription;
    }

    public async Task<Subscription> GetSubscriptionAsync(Guid id)
    {
        var subscription = await _repository.GetByIdAsync(id);
        if (subscription == null)
            throw new KeyNotFoundException("Subscription not found");
        return subscription;
    }

    public async Task<Subscription> CancelSubscriptionAsync(Guid id)
    {
        var subscription = await GetSubscriptionAsync(id);
        subscription.Status = "Cancelled";
        subscription.CancelledAt = DateTime.UtcNow;
        await _repository.UpdateAsync(subscription);
        return subscription;
    }

    public async Task<Subscription> RetryBillingAsync(Guid id)
    {
        var subscription = await GetSubscriptionAsync(id);
        if (subscription.Status == "Cancelled")
            throw new InvalidOperationException("Subscription is cancelled");

        subscription.Status = "Active";
        subscription.LastBilledAt = DateTime.UtcNow;
        subscription.NextBillingAt = DateTime.UtcNow.AddMonths(1);
        await _repository.UpdateAsync(subscription);
        return subscription;
    }
}
