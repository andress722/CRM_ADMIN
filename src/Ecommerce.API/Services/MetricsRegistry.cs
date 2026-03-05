using System.Collections.Concurrent;
using System.Text;

namespace Ecommerce.API.Services;

public class MetricsRegistry
{
    private static readonly double[] LatencyBuckets = { 25, 50, 100, 250, 500, 1000, 2500, 5000 };
    private readonly ConcurrentDictionary<string, long> _requests = new();
    private readonly ConcurrentDictionary<string, long> _responses = new();
    private readonly ConcurrentDictionary<string, long> _responseClasses = new();
    private readonly ConcurrentDictionary<string, long> _latencyBuckets = new();
    private readonly ConcurrentDictionary<string, long> _latencyCounts = new();
    private readonly ConcurrentDictionary<string, double> _latencySums = new();

    public void RecordRequest(string path, string method, int statusCode, long elapsedMs)
    {
        var normalized = NormalizePath(path);
        var normalizedMethod = NormalizeMethod(method);
        var key = $"{normalizedMethod}:{normalized}";
        _requests.AddOrUpdate(key, 1, (_, current) => current + 1);
        _responses.AddOrUpdate($"{key}:{statusCode}", 1, (_, current) => current + 1);

        var statusClass = $"{statusCode / 100}xx";
        _responseClasses.AddOrUpdate($"{key}:{statusClass}", 1, (_, current) => current + 1);

        var bucket = ResolveBucket(elapsedMs);
        _latencyBuckets.AddOrUpdate($"{key}:{bucket}", 1, (_, current) => current + 1);
        _latencyCounts.AddOrUpdate(key, 1, (_, current) => current + 1);
        _latencySums.AddOrUpdate(key, elapsedMs, (_, current) => current + elapsedMs);
    }

    public object Snapshot()
    {
        var totalRequests = _requests.Values.Sum();
        var totalResponses = _responses.Values.Sum();
        var total5xx = _responses
            .Where(x =>
            {
                var parts = x.Key.Split(':');
                if (parts.Length < 3)
                {
                    return false;
                }

                return int.TryParse(parts[^1], out var code) && code >= 500 && code < 600;
            })
            .Sum(x => x.Value);

        var avgLatency = _latencyCounts.Values.Sum() > 0
            ? _latencySums.Values.Sum() / _latencyCounts.Values.Sum()
            : 0;

        var errorRate = totalResponses > 0 ? (double)total5xx / totalResponses : 0;

        return new
        {
            totalRequests,
            totalResponses,
            total5xx,
            avgLatencyMs = Math.Round(avgLatency, 2),
            errorRate
        };
    }
    public string ToPrometheus()
    {
        var sb = new StringBuilder();
        sb.AppendLine("# HELP http_requests_total Total HTTP requests by method and path.");
        sb.AppendLine("# TYPE http_requests_total counter");
        foreach (var entry in _requests.OrderBy(e => e.Key))
        {
            var (method, path) = SplitKey(entry.Key);
            sb.AppendLine($"http_requests_total{{method=\"{method}\",path=\"{path}\"}} {entry.Value}");
        }

        sb.AppendLine("# HELP http_responses_total Total HTTP responses by method, path, and status.");
        sb.AppendLine("# TYPE http_responses_total counter");
        foreach (var entry in _responses.OrderBy(e => e.Key))
        {
            var parts = entry.Key.Split(':', 3);
            var method = parts[0];
            var path = parts.Length > 1 ? parts[1] : "";
            var status = parts.Length > 2 ? parts[2] : "";
            sb.AppendLine($"http_responses_total{{method=\"{method}\",path=\"{path}\",status=\"{status}\"}} {entry.Value}");
        }

        sb.AppendLine("# HELP http_responses_class_total Total HTTP responses by method, path, and status class.");
        sb.AppendLine("# TYPE http_responses_class_total counter");
        foreach (var entry in _responseClasses.OrderBy(e => e.Key))
        {
            var parts = entry.Key.Split(':', 3);
            var method = parts[0];
            var path = parts.Length > 1 ? parts[1] : "";
            var statusClass = parts.Length > 2 ? parts[2] : "";
            sb.AppendLine($"http_responses_class_total{{method=\"{method}\",path=\"{path}\",class=\"{statusClass}\"}} {entry.Value}");
        }

        sb.AppendLine("# HELP http_request_duration_ms Request duration in milliseconds.");
        sb.AppendLine("# TYPE http_request_duration_ms histogram");

        var latencyGroups = _latencyBuckets.Keys
            .Select(SplitLatencyKey)
            .GroupBy(x => x.key)
            .OrderBy(g => g.Key);

        foreach (var group in latencyGroups)
        {
            var (method, path) = SplitKey(group.Key);
            long cumulative = 0;
            foreach (var bucket in LatencyBucketLabels())
            {
                var bucketKey = $"{group.Key}:{bucket}";
                _latencyBuckets.TryGetValue(bucketKey, out var count);
                cumulative += count;
                sb.AppendLine($"http_request_duration_ms_bucket{{method=\"{method}\",path=\"{path}\",le=\"{bucket}\"}} {cumulative}");
            }

            _latencyCounts.TryGetValue(group.Key, out var totalCount);
            _latencySums.TryGetValue(group.Key, out var totalSum);
            sb.AppendLine($"http_request_duration_ms_count{{method=\"{method}\",path=\"{path}\"}} {totalCount}");
            sb.AppendLine($"http_request_duration_ms_sum{{method=\"{method}\",path=\"{path}\"}} {totalSum}");
        }

        return sb.ToString();
    }

    private static string NormalizePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        return path.ToLowerInvariant();
    }

    private static string NormalizeMethod(string method)
        => string.IsNullOrWhiteSpace(method) ? "GET" : method.Trim().ToUpperInvariant();

    private static string ResolveBucket(long elapsedMs)
    {
        foreach (var bucket in LatencyBuckets)
        {
            if (elapsedMs <= bucket)
            {
                return bucket.ToString("0", System.Globalization.CultureInfo.InvariantCulture);
            }
        }

        return "+Inf";
    }

    private static IEnumerable<string> LatencyBucketLabels()
    {
        foreach (var bucket in LatencyBuckets)
        {
            yield return bucket.ToString("0", System.Globalization.CultureInfo.InvariantCulture);
        }

        yield return "+Inf";
    }

    private static (string method, string path) SplitKey(string key)
    {
        var parts = key.Split(':', 2);
        return (parts[0], parts.Length > 1 ? parts[1] : "/");
    }

    private static (string key, string bucket) SplitLatencyKey(string key)
    {
        var parts = key.Split(':', 3);
        var method = parts[0];
        var path = parts.Length > 1 ? parts[1] : "/";
        var bucket = parts.Length > 2 ? parts[2] : "+Inf";
        return ($"{method}:{path}", bucket);
    }
}




