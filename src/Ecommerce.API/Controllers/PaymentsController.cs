using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador para gerenciar pagamentos
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _service;
    private readonly IConfiguration _configuration;

    public PaymentsController(PaymentService service, IConfiguration configuration)
    {
        _service = service;
        _configuration = configuration;
    }

    /// <summary>
    /// Obtém um pagamento por ID
    /// </summary>
    /// <param name="id">ID do pagamento</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPayment(Guid id)
    {
        try
        {
            var payment = await _service.GetPaymentAsync(id);
            return Ok(payment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Obtém pagamento de um pedido
    /// </summary>
    /// <param name="orderId">ID do pedido</param>
    [HttpGet("order/{orderId}")]
    public async Task<IActionResult> GetOrderPayment(Guid orderId)
    {
        try
        {
            var payment = await _service.GetOrderPaymentAsync(orderId);
            return Ok(payment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cria um novo pagamento
    /// </summary>
    /// <param name="request">Dados do pagamento</param>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreatePayment(CreatePaymentRequest request)
    {
        try
        {
            var payment = await _service.CreatePaymentAsync(request.OrderId, request.Method, request.Amount);
            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cria preferência de checkout no Mercado Pago
    /// </summary>
    [HttpPost("checkout")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateCheckout(CheckoutRequest request)
    {
        try
        {
            if (request.OrderId == Guid.Empty)
            {
                return BadRequest(new { message = "OrderId is required" });
            }

            if (!string.IsNullOrWhiteSpace(request.PayerEmail) && !IsValidEmail(request.PayerEmail))
            {
                return BadRequest(new { message = "Invalid payer email" });
            }

            var webhookUrl = _configuration["Payments:MercadoPago:WebhookUrl"];
            var currency = _configuration["Payments:MercadoPago:Currency"] ?? "BRL";
            var result = await _service.CreateCheckoutAsync(request.OrderId, request.PayerEmail, currency, webhookUrl);

            return Ok(new
            {
                paymentId = result.payment.Id,
                preferenceId = result.preference.PreferenceId,
                initPoint = result.preference.InitPoint,
                sandboxInitPoint = result.preference.SandboxInitPoint
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Autoriza um pagamento
    /// </summary>
    /// <param name="id">ID do pagamento</param>
    /// <param name="request">Dados da autorização</param>
    [HttpPost("{id}/authorize")]
    [Authorize]
    public async Task<IActionResult> AuthorizePayment(Guid id, AuthorizePaymentRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.TransactionId))
            {
                return BadRequest(new { message = "TransactionId is required" });
            }

            var payment = await _service.AuthorizePaymentAsync(id, request.TransactionId);
            return Ok(payment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Captura um pagamento autorizado
    /// </summary>
    /// <param name="id">ID do pagamento</param>
    [HttpPost("{id}/capture")]
    [Authorize]
    public async Task<IActionResult> CapturePayment(Guid id)
    {
        try
        {
            var payment = await _service.CapturePaymentAsync(id);
            return Ok(payment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static string NormalizeDigits(string value)
        => new string(value.Where(char.IsDigit).ToArray());

    private static bool IsValidPhone(string areaCode, string number)
        => areaCode.Length == 2 && number.Length is >= 8 and <= 9;

    private static bool IsValidCpf(string cpf)
    {
        if (cpf.Length != 11)
        {
            return false;
        }

        if (cpf.Distinct().Count() == 1)
        {
            return false;
        }

        var digits = cpf.Select(c => c - '0').ToArray();
        var sum1 = 0;
        for (var i = 0; i < 9; i++)
        {
            sum1 += digits[i] * (10 - i);
        }

        var mod1 = sum1 % 11;
        var check1 = mod1 < 2 ? 0 : 11 - mod1;
        if (digits[9] != check1)
        {
            return false;
        }

        var sum2 = 0;
        for (var i = 0; i < 10; i++)
        {
            sum2 += digits[i] * (11 - i);
        }

        var mod2 = sum2 % 11;
        var check2 = mod2 < 2 ? 0 : 11 - mod2;
        return digits[10] == check2;
    }

    private static string MapGatewayStatusMessage(string status, string? statusDetail)
        => status.ToLowerInvariant() switch
        {
            "approved" => "Pagamento aprovado.",
            "authorized" => "Pagamento autorizado. Aguarde a captura.",
            "in_process" => "Pagamento em processamento.",
            "pending" => "Pagamento pendente.",
            "cancelled" => "Pagamento cancelado.",
            "rejected" => MapRejectedMessage(statusDetail),
            _ => "Pagamento recebido."
        };

    private static string MapRejectedMessage(string? statusDetail)
        => statusDetail?.ToLowerInvariant() switch
        {
            "cc_rejected_bad_filled_card_number" => "Número do cartão inválido.",
            "cc_rejected_bad_filled_date" => "Data de validade inválida.",
            "cc_rejected_bad_filled_security_code" => "CVV inválido.",
            "cc_rejected_bad_filled_other" => "Dados do cartão inválidos.",
            "cc_rejected_call_for_authorize" => "Pagamento recusado. Contate a operadora do cartão.",
            "cc_rejected_card_disabled" => "Cartão desabilitado. Contate a operadora.",
            "cc_rejected_insufficient_amount" => "Saldo insuficiente.",
            "cc_rejected_max_attempts" => "Número máximo de tentativas excedido.",
            "cc_rejected_other_reason" => "Pagamento recusado pela operadora.",
            "cc_rejected_card_error" => "Erro ao processar o cartão.",
            "cc_rejected_duplicated_payment" => "Pagamento duplicado.",
            "cc_rejected_high_risk" => "Pagamento recusado por risco elevado.",
            _ => "Pagamento recusado."
        };
    /// <summary>
    /// Checkout transparente (Pix, Cartão, Boleto)
    /// </summary>
    [HttpPost("transparent")]
    [Authorize]
    public async Task<IActionResult> TransparentCheckout(TransparentCheckoutRequest request)
    {
        try
        {
            if (request.OrderId == Guid.Empty)
            {
                return BadRequest(new { message = "OrderId is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Method))
            {
                return BadRequest(new { message = "Method is required" });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (request.Payer == null)
            {
                return BadRequest(new { message = "Payer is required" });
            }

            if (!IsValidEmail(request.Payer.Email))
            {
                return BadRequest(new { message = "Invalid payer email" });
            }

            if (string.IsNullOrWhiteSpace(request.Payer.FirstName) || string.IsNullOrWhiteSpace(request.Payer.LastName))
            {
                return BadRequest(new { message = "Payer name is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Payer.IdentificationNumber))
            {
                return BadRequest(new { message = "Payer document is required" });
            }

            if (!string.IsNullOrWhiteSpace(request.Payer.IdentificationType) &&
                !request.Payer.IdentificationType.Equals("CPF", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only CPF identification is supported" });
            }

            var normalizedCpf = NormalizeDigits(request.Payer.IdentificationNumber);
            if (!IsValidCpf(normalizedCpf))
            {
                return BadRequest(new { message = "Invalid CPF" });
            }

            var normalizedArea = NormalizeDigits(request.Payer.PhoneAreaCode ?? string.Empty);
            var normalizedNumber = NormalizeDigits(request.Payer.PhoneNumber ?? string.Empty);
            if (!IsValidPhone(normalizedArea, normalizedNumber))
            {
                return BadRequest(new { message = "Invalid phone" });
            }

            if (request.Method.Equals("card", StringComparison.OrdinalIgnoreCase))
            {
                if (request.Card == null || string.IsNullOrWhiteSpace(request.Card.Token) || string.IsNullOrWhiteSpace(request.Card.PaymentMethodId))
                {
                    return BadRequest(new { message = "Card token and payment method are required" });
                }
            }

            var webhookUrl = _configuration["Payments:MercadoPago:WebhookUrl"];
            var currency = _configuration["Payments:MercadoPago:Currency"] ?? "BRL";

            var gatewayRequest = new PaymentGatewayPaymentRequest(
                Guid.Empty,
                request.OrderId,
                request.Amount,
                currency,
                request.Method,
                request.PaymentMethodId,
                request.Description,
                webhookUrl,
                new PaymentGatewayPayer(
                    request.Payer.Email,
                    request.Payer.FirstName,
                    request.Payer.LastName,
                    "CPF",
                    normalizedCpf,
                    normalizedArea,
                    normalizedNumber
                ),
                request.Card == null
                    ? null
                    : new PaymentGatewayCard(
                        request.Card.Token,
                        request.Card.Installments <= 0 ? 1 : request.Card.Installments,
                        request.Card.PaymentMethodId,
                        request.Card.IssuerId)
            );

            var result = await _service.CreateTransparentPaymentAsync(request.OrderId, currency, webhookUrl, gatewayRequest);
            return Ok(new
            {
                paymentId = result.payment.Id,
                status = result.payment.Status.ToString(),
                gatewayStatus = result.result.Status,
                gatewayStatusDetail = result.result.StatusDetail,
                statusMessage = MapGatewayStatusMessage(result.result.Status, result.result.StatusDetail),
                transactionId = result.result.TransactionId,
                pixQrCode = result.result.PixQrCode,
                pixQrCodeBase64 = result.result.PixQrCodeBase64,
                boletoUrl = result.result.BoletoUrl
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

/// <summary>Dados para criar um pagamento</summary>
public record CreatePaymentRequest(
    Guid OrderId,
    PaymentMethod Method,
    decimal Amount
);

/// <summary>Dados para autorizar um pagamento</summary>
public record AuthorizePaymentRequest(
    string TransactionId
);

/// <summary>Dados para checkout Mercado Pago</summary>
public record CheckoutRequest(
    Guid OrderId,
    string? PayerEmail
);

/// <summary>Checkout transparente</summary>
public record TransparentCheckoutRequest(
    Guid OrderId,
    string Method,
    decimal Amount,
    string? PaymentMethodId,
    string? Description,
    TransparentPayer Payer,
    TransparentCard? Card
);

public record TransparentPayer(
    string Email,
    string FirstName,
    string LastName,
    string? IdentificationType,
    string IdentificationNumber,
    string? PhoneAreaCode,
    string? PhoneNumber
);

public record TransparentCard(
    string Token,
    int Installments,
    string PaymentMethodId,
    string? IssuerId
);
