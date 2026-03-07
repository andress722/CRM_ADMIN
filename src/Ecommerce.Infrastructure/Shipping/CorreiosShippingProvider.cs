using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Shipping;

public class CorreiosShippingProvider : IShippingProvider
{
    private static readonly object AlertSync = new();
    private static DateTime _lastFallbackAlertAtUtc = DateTime.MinValue;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CorreiosShippingProvider> _logger;
    private readonly IEmailService _emailService;

    public CorreiosShippingProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<CorreiosShippingProvider> logger,
        IEmailService emailService)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task<IReadOnlyList<ShippingQuote>> GetQuotesAsync(string zipCode)
    {
        var baseUrl = GetBaseUrl();
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return await GetFallbackQuotesAsync("missing_base_url", zipCode);
        }

        try
        {
            var client = CreateClient(baseUrl);
            var response = await client.GetAsync($"/prices?zipCode={zipCode}");
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Correios quotes failed: {Status}", response.StatusCode);
                return await GetFallbackQuotesAsync($"http_status_{(int)response.StatusCode}", zipCode);
            }

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (!root.TryGetProperty("quotes", out var quotesElement) || quotesElement.ValueKind != JsonValueKind.Array)
            {
                return await GetFallbackQuotesAsync("invalid_payload_quotes_missing", zipCode);
            }

            var quotes = new List<ShippingQuote>();
            foreach (var quote in quotesElement.EnumerateArray())
            {
                var provider = quote.TryGetProperty("provider", out var providerProp)
                    ? providerProp.GetString() ?? "Correios"
                    : "Correios";
                var service = quote.TryGetProperty("service", out var serviceProp)
                    ? serviceProp.GetString() ?? ""
                    : "";
                var price = quote.TryGetProperty("price", out var priceProp)
                    ? priceProp.GetDecimal()
                    : 0m;
                var days = quote.TryGetProperty("days", out var daysProp)
                    ? daysProp.GetInt32()
                    : 0;

                if (!string.IsNullOrWhiteSpace(service))
                {
                    quotes.Add(new ShippingQuote(provider, service, price, days));
                }
            }

            return quotes.Count > 0 ? quotes : await GetFallbackQuotesAsync("empty_quote_list", zipCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Correios quotes error");
            return await GetFallbackQuotesAsync("exception", zipCode);
        }
    }

    public async Task<(string trackingNumber, string status)?> CreateShipmentAsync(Guid orderId, string service, string address)
    {
        var baseUrl = GetBaseUrl();
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        try
        {
            var client = CreateClient(baseUrl);
            var payload = JsonSerializer.Serialize(new
            {
                orderId,
                service,
                address
            });
            var response = await client.PostAsync("/shipments", new StringContent(payload, Encoding.UTF8, "application/json"));
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Correios shipment failed: {Status}", response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var trackingNumber = root.TryGetProperty("trackingNumber", out var trackingProp)
                ? trackingProp.GetString()
                : null;
            var status = root.TryGetProperty("status", out var statusProp)
                ? statusProp.GetString() ?? "Created"
                : "Created";

            if (string.IsNullOrWhiteSpace(trackingNumber))
            {
                return null;
            }

            return (trackingNumber, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Correios shipment error");
            return null;
        }
    }

    public async Task<(string status, DateTime? occurredAt)?> TrackAsync(string trackingNumber)
    {
        var baseUrl = GetBaseUrl();
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        try
        {
            var client = CreateClient(baseUrl);
            var response = await client.GetAsync($"/tracking/{trackingNumber}");
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Correios tracking failed: {Status}", response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var statusProp)
                ? statusProp.GetString() ?? ""
                : "";
            var occurredAt = root.TryGetProperty("occurredAt", out var occurredProp) && occurredProp.ValueKind == JsonValueKind.String
                && DateTime.TryParse(occurredProp.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var parsed)
                ? parsed
                : (DateTime?)null;

            if (string.IsNullOrWhiteSpace(status))
            {
                return null;
            }

            return (status, occurredAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Correios tracking error");
            return null;
        }
    }

    private string? GetBaseUrl()
        => _configuration["Shipping:Correios:BaseUrl"];

    private HttpClient CreateClient(string baseUrl)
    {
        var client = _httpClientFactory.CreateClient("Correios");
        if (!client.BaseAddress?.ToString().Equals(baseUrl, StringComparison.OrdinalIgnoreCase) ?? true)
        {
            client.BaseAddress = new Uri(baseUrl);
        }

        var accessToken = _configuration["Shipping:Correios:AccessToken"];
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        }

        return client;
    }

    private async Task<IReadOnlyList<ShippingQuote>> GetFallbackQuotesAsync(string reason, string? zipCode)
    {
        _logger.LogWarning(
            "Shipping fallback quotes activated. reason={Reason} zipCode={ZipCode}",
            reason,
            zipCode ?? "n/a");

        await TrySendFallbackAlertAsync(reason, zipCode);

        return new List<ShippingQuote>
        {
            new("Correios", "PAC", 25.9m, 5),
            new("Correios", "SEDEX", 45.0m, 2)
        };
    }

    private async Task TrySendFallbackAlertAsync(string reason, string? zipCode)
    {
        var recipientsRaw = _configuration["Alerts:EmailRecipients"];
        if (string.IsNullOrWhiteSpace(recipientsRaw))
        {
            return;
        }

        var now = DateTime.UtcNow;
        var shouldSend = false;
        lock (AlertSync)
        {
            if ((now - _lastFallbackAlertAtUtc) >= TimeSpan.FromMinutes(15))
            {
                _lastFallbackAlertAtUtc = now;
                shouldSend = true;
            }
        }

        if (!shouldSend)
        {
            return;
        }

        var recipients = recipientsRaw
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (recipients.Count == 0)
        {
            return;
        }

        var subject = "[ALERTA] Fallback de cotacao de frete ativado";
        var html = $"<h3>Fallback de frete ativado</h3><p><strong>Motivo:</strong> {reason}</p><p><strong>CEP:</strong> {zipCode ?? "n/a"}</p><p><strong>UTC:</strong> {now:O}</p>";
        var text = $"Fallback de frete ativado\nMotivo: {reason}\nCEP: {zipCode ?? "n/a"}\nUTC: {now:O}";

        foreach (var recipient in recipients)
        {
            try
            {
                await _emailService.SendCustomEmailAsync(recipient, subject, html, text);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send shipping fallback alert email to {Recipient}", recipient);
            }
        }
    }
}
