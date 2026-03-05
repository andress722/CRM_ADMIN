using System.Collections.Concurrent;

namespace Ecommerce.API.Services;

public interface IRequestThrottleService
{
    bool IsAllowed(string scope, string key, int limit, TimeSpan window);
}

public class InMemoryRequestThrottleService : IRequestThrottleService
{
    private readonly ConcurrentDictionary<string, ConcurrentQueue<DateTime>> _requests = new();

    public bool IsAllowed(string scope, string key, int limit, TimeSpan window)
    {
        var now = DateTime.UtcNow;
        var composite = $"{scope}:{key}";
        var queue = _requests.GetOrAdd(composite, _ => new ConcurrentQueue<DateTime>());

        while (queue.TryPeek(out var timestamp) && now - timestamp > window)
        {
            queue.TryDequeue(out _);
        }

        if (queue.Count >= limit)
        {
            return false;
        }

        queue.Enqueue(now);
        return true;
    }
}
