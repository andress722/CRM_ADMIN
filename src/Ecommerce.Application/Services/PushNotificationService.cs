using Ecommerce.Application.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace Ecommerce.Application.Services;

public class PushNotificationService
{
    private static readonly HashSet<string> SupportedPlatforms = new(StringComparer.OrdinalIgnoreCase)
    {
        "ios",
        "android",
        "expo",
        "web"
    };

    private readonly IPushDeviceRepository _repository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        IPushDeviceRepository repository,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PushNotificationService> logger)
    {
        _repository = repository;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public static bool IsSupportedPlatform(string? platform)
        => !string.IsNullOrWhiteSpace(platform) && SupportedPlatforms.Contains(platform.Trim());

    public async Task<PushDispatchResult> SendToUserAsync(Guid userId, PushMessage message, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message.Title) || string.IsNullOrWhiteSpace(message.Body))
        {
            throw new ArgumentException("Title and body are required");
        }

        ValidateDeepLink(message.DeepLink);

        var devices = (await _repository.GetByUserAsync(userId))
            .Where(device => IsSupportedPlatform(device.Platform) && !string.IsNullOrWhiteSpace(device.Token))
            .ToList();

        if (devices.Count == 0)
        {
            return new PushDispatchResult(0, 0, 0, ResolveProvider(), message.DeepLink, "No registered devices");
        }

        var provider = ResolveProvider();
        return provider switch
        {
            "expo" => await SendViaExpoAsync(devices, message, ct),
            "generic" => await SendViaGenericAsync(devices, message, ct),
            _ => SendViaLog(devices, message, provider)
        };
    }

    public void ValidateDeepLink(string? deepLink)
    {
        if (string.IsNullOrWhiteSpace(deepLink))
        {
            return;
        }

        var trimmed = deepLink.Trim();
        if (trimmed.StartsWith('/'))
        {
            return;
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException("Deep link must be an absolute URI or app-relative path");
        }

        var allowedSchemes = _configuration.GetSection("Mobile:DeepLinks:AllowedSchemes").Get<string[]>()
            ?.Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToArray();

        if (allowedSchemes == null || allowedSchemes.Length == 0)
        {
            allowedSchemes = new[] { "ecommerce" };
        }

        if (!allowedSchemes.Contains(uri.Scheme, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Deep link scheme '{uri.Scheme}' is not allowed");
        }
    }

    private string ResolveProvider()
        => (_configuration["Push:Provider"] ?? "log").Trim().ToLowerInvariant();

    private PushDispatchResult SendViaLog(IReadOnlyList<Domain.Entities.PushDevice> devices, PushMessage message, string provider)
    {
        foreach (var device in devices)
        {
            _logger.LogInformation(
                "Push notification queued locally. provider={Provider} userId={UserId} platform={Platform} tokenSuffix={TokenSuffix} title={Title} deepLink={DeepLink}",
                provider,
                device.UserId,
                device.Platform,
                Suffix(device.Token),
                message.Title,
                message.DeepLink);
        }

        return new PushDispatchResult(devices.Count, devices.Count, 0, provider, message.DeepLink, null);
    }

    private async Task<PushDispatchResult> SendViaExpoAsync(IReadOnlyList<Domain.Entities.PushDevice> devices, PushMessage message, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var url = _configuration["Push:Expo:BaseUrl"] ?? "https://exp.host/--/api/v2/push/send";

        var payload = devices.Select(device => new
        {
            to = device.Token,
            title = message.Title,
            body = message.Body,
            data = BuildData(message)
        }).ToList();

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        var accessToken = _configuration["Push:Expo:AccessToken"];
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {accessToken}");
        }

        try
        {
            using var response = await client.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
            {
                return new PushDispatchResult(devices.Count, devices.Count, 0, "expo", message.DeepLink, null);
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Expo push provider returned HTTP {StatusCode}. body={Body}", (int)response.StatusCode, body);
            return new PushDispatchResult(devices.Count, 0, devices.Count, "expo", message.DeepLink, $"provider_http_{(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Expo push send failed.");
            return new PushDispatchResult(devices.Count, 0, devices.Count, "expo", message.DeepLink, "provider_exception");
        }
    }

    private async Task<PushDispatchResult> SendViaGenericAsync(IReadOnlyList<Domain.Entities.PushDevice> devices, PushMessage message, CancellationToken ct)
    {
        var url = _configuration["Push:Generic:SendUrl"];
        if (string.IsNullOrWhiteSpace(url))
        {
            return new PushDispatchResult(devices.Count, 0, devices.Count, "generic", message.DeepLink, "push_generic_send_url_missing");
        }

        var client = _httpClientFactory.CreateClient();
        var success = 0;
        var failed = 0;

        foreach (var device in devices)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(new
                {
                    token = device.Token,
                    platform = device.Platform,
                    title = message.Title,
                    body = message.Body,
                    deepLink = message.DeepLink,
                    data = BuildData(message)
                }), Encoding.UTF8, "application/json")
            };

            var apiKey = _configuration["Push:Generic:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                request.Headers.TryAddWithoutValidation(_configuration["Push:Generic:ApiKeyHeader"] ?? "Authorization", apiKey);
            }

            try
            {
                using var response = await client.SendAsync(request, ct);
                if (response.IsSuccessStatusCode)
                {
                    success++;
                }
                else
                {
                    failed++;
                }
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogWarning(ex, "Generic push send failed for platform={Platform} tokenSuffix={TokenSuffix}", device.Platform, Suffix(device.Token));
            }
        }

        return new PushDispatchResult(devices.Count, success, failed, "generic", message.DeepLink, failed > 0 ? "partial_failure" : null);
    }

    private static Dictionary<string, string> BuildData(PushMessage message)
    {
        var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(message.DeepLink))
        {
            data["deepLink"] = message.DeepLink.Trim();
        }

        foreach (var pair in message.Data)
        {
            if (!string.IsNullOrWhiteSpace(pair.Key) && pair.Value != null)
            {
                data[pair.Key] = pair.Value;
            }
        }

        return data;
    }

    private static string Suffix(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return "empty";
        }

        return token.Length <= 8 ? token : token[^8..];
    }

    public sealed record PushMessage(
        string Title,
        string Body,
        string? DeepLink,
        IReadOnlyDictionary<string, string> Data);

    public sealed record PushDispatchResult(
        int Attempted,
        int Succeeded,
        int Failed,
        string Provider,
        string? DeepLink,
        string? Error);
}
