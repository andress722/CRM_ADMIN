using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Payments;

public class MercadoPagoPaymentGateway : IPaymentGateway
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MercadoPagoPaymentGateway> _logger;

    public MercadoPagoPaymentGateway(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<MercadoPagoPaymentGateway> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public Task<PaymentGatewayResult?> GetPaymentAsync(string transactionId)
        => FetchPaymentAsync(transactionId);

    public async Task<PaymentGatewayPaymentResult?> CreatePaymentAsync(PaymentGatewayPaymentRequest request)
    {
        var client = CreateClient();
        var paymentMethodId = ResolvePaymentMethodId(request);
        var payload = new Dictionary<string, object?>
        {
            ["transaction_amount"] = request.Amount,
            ["description"] = request.Description ?? $"Order {request.OrderId}",
            ["payment_method_id"] = paymentMethodId,
            ["external_reference"] = request.PaymentId.ToString(),
            ["notification_url"] = request.WebhookUrl,
            ["payer"] = new
            {
                email = request.Payer.Email,
                first_name = request.Payer.FirstName,
                last_name = request.Payer.LastName,
                identification = new
                {
                    type = request.Payer.IdentificationType,
                    number = request.Payer.IdentificationNumber
                },
                phone = string.IsNullOrWhiteSpace(request.Payer.PhoneNumber)
                    ? null
                    : new
                    {
                        area_code = request.Payer.PhoneAreaCode,
                        number = request.Payer.PhoneNumber
                    }
            }
        };

        if (request.Card != null)
        {
            payload["token"] = request.Card.Token;
            payload["installments"] = request.Card.Installments;
            payload["payment_method_id"] = request.Card.PaymentMethodId;
            if (!string.IsNullOrWhiteSpace(request.Card.IssuerId))
            {
                payload["issuer_id"] = request.Card.IssuerId;
            }
        }

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        var response = await client.PostAsync(
            "https://api.mercadopago.com/v1/payments",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Mercado Pago payment failed: {Status}", response.StatusCode);
            return null;
        }

        var body = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var id = root.GetProperty("id").ToString();
            var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "" : "";
            var statusDetail = root.TryGetProperty("status_detail", out var statusDetailProp)
                ? statusDetailProp.GetString()
                : null;
            var amount = root.TryGetProperty("transaction_amount", out var amountProp)
                ? amountProp.GetDecimal()
                : request.Amount;
            var externalRef = root.TryGetProperty("external_reference", out var externalProp)
                ? externalProp.GetString()
                : null;

            string? pixQrCode = null;
            string? pixQrCodeBase64 = null;
            string? boletoUrl = null;

            if (root.TryGetProperty("point_of_interaction", out var poi) &&
                poi.TryGetProperty("transaction_data", out var txData))
            {
                if (txData.TryGetProperty("qr_code", out var qr))
                {
                    pixQrCode = qr.GetString();
                }
                if (txData.TryGetProperty("qr_code_base64", out var qr64))
                {
                    pixQrCodeBase64 = qr64.GetString();
                }
                if (txData.TryGetProperty("ticket_url", out var ticket))
                {
                    boletoUrl = ticket.GetString();
                }
            }

            if (root.TryGetProperty("transaction_details", out var details) &&
                details.TryGetProperty("external_resource_url", out var externalUrl))
            {
                boletoUrl ??= externalUrl.GetString();
            }

            return new PaymentGatewayPaymentResult(id, amount, status, statusDetail, externalRef, pixQrCode, pixQrCodeBase64, boletoUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Mercado Pago payment response: {Body}", body);
            return null;
        }
    }

    public async Task<CheckoutPreferenceResult?> CreatePreferenceAsync(PaymentGatewayPreferenceRequest request)
    {
        var client = CreateClient();
        var payload = new
        {
            external_reference = request.PaymentId.ToString(),
            notification_url = request.WebhookUrl,
            items = request.Items.Select(item => new
            {
                title = item.Title,
                quantity = item.Quantity,
                unit_price = item.UnitPrice,
                currency_id = request.Currency
            }).ToArray(),
            payer = string.IsNullOrWhiteSpace(request.PayerEmail)
                ? null
                : new { email = request.PayerEmail }
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        var response = await client.PostAsync(
            "https://api.mercadopago.com/checkout/preferences",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Mercado Pago preference failed: {Status}", response.StatusCode);
            return null;
        }

        var body = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var preferenceId = root.GetProperty("id").GetString() ?? string.Empty;
            var initPoint = root.TryGetProperty("init_point", out var init) ? init.GetString() : null;
            var sandboxInit = root.TryGetProperty("sandbox_init_point", out var sandbox) ? sandbox.GetString() : null;

            return new CheckoutPreferenceResult(preferenceId, initPoint, sandboxInit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Mercado Pago preference response: {Body}", body);
            return null;
        }
    }

    public async Task<PaymentGatewayResult?> CapturePaymentAsync(string transactionId)
    {
        var client = CreateClient();
        var response = await client.PutAsync($"https://api.mercadopago.com/v1/payments/{transactionId}",
            new StringContent("{\"capture\":true}", System.Text.Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Mercado Pago capture failed: {Status}", response.StatusCode);
            return null;
        }

        return await ParsePaymentAsync(response);
    }

    public async Task<PaymentGatewayRefundResult?> RefundPaymentAsync(string transactionId, decimal amount)
    {
        var client = CreateClient();
        StringContent? content = null;
        if (amount > 0)
        {
            var payload = JsonSerializer.Serialize(new { amount });
            content = new StringContent(payload, Encoding.UTF8, "application/json");
        }

        var response = await client.PostAsync(
            $"https://api.mercadopago.com/v1/payments/{transactionId}/refunds",
            content ?? new StringContent(string.Empty, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Mercado Pago refund failed: {Status}", response.StatusCode);
            return null;
        }

        var body = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var refundId = root.GetProperty("id").ToString();
            var refundAmount = root.TryGetProperty("amount", out var amountProp)
                ? amountProp.GetDecimal()
                : amount;
            var status = root.TryGetProperty("status", out var statusProp)
                ? statusProp.GetString() ?? ""
                : "";

            return new PaymentGatewayRefundResult(refundId, refundAmount, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Mercado Pago refund response: {Body}", body);
            return null;
        }
    }

    private async Task<PaymentGatewayResult?> FetchPaymentAsync(string transactionId)
    {
        var client = CreateClient();
        var response = await client.GetAsync($"https://api.mercadopago.com/v1/payments/{transactionId}");
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Mercado Pago get failed: {Status}", response.StatusCode);
            return null;
        }

        return await ParsePaymentAsync(response);
    }

    private async Task<PaymentGatewayResult?> ParsePaymentAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var id = root.GetProperty("id").ToString();
            var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "" : "";
            var amount = root.TryGetProperty("transaction_amount", out var amountProp)
                ? amountProp.GetDecimal()
                : 0m;
            var externalRef = root.TryGetProperty("external_reference", out var externalProp)
                ? externalProp.GetString()
                : null;

            return new PaymentGatewayResult(id, amount, status, externalRef);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Mercado Pago response: {Body}", json);
            return null;
        }
    }

    private HttpClient CreateClient()
    {
        var accessToken = _configuration["Payments:MercadoPago:AccessToken"] ?? string.Empty;
        var client = _httpClientFactory.CreateClient("MercadoPago");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static string ResolvePaymentMethodId(PaymentGatewayPaymentRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.PaymentMethodId))
        {
            return request.PaymentMethodId;
        }

        return request.PaymentMethod.ToLowerInvariant() switch
        {
            "pix" => "pix",
            "boleto" => "bolbradesco",
            _ => ""
        };
    }
}
