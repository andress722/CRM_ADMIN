using System.Net.Http.Json;

namespace Ecommerce.API.Services;

public interface ICaptchaVerifier
{
    Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken ct = default);
}

public class CaptchaVerifier : ICaptchaVerifier
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CaptchaVerifier> _logger;

    public CaptchaVerifier(HttpClient httpClient, IConfiguration configuration, ILogger<CaptchaVerifier> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken ct = default)
    {
        var enabled = _configuration.GetValue("Security:Captcha:Enabled", false);
        if (!enabled)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var secret = _configuration["Security:Captcha:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger.LogWarning("Captcha is enabled but SecretKey is not configured.");
            return false;
        }

        var endpoint = _configuration["Security:Captcha:VerifyUrl"]
            ?? "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secret,
                ["response"] = token,
                ["remoteip"] = remoteIp ?? string.Empty
            })
        };

        try
        {
            using var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            var payload = await response.Content.ReadFromJsonAsync<CaptchaResponse>(cancellationToken: ct);
            return payload?.Success == true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Captcha verification failed with exception.");
            return false;
        }
    }

    private sealed class CaptchaResponse
    {
        public bool Success { get; set; }
    }
}
