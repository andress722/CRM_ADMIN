using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Microsoft.Extensions.Configuration;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly SubscriptionService _service;
    private readonly IConfiguration _configuration;

    public SubscriptionsController(SubscriptionService service, IConfiguration configuration)
    {
        _service = service;
        _configuration = configuration;
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public IActionResult GetPlans()
    {
        var configuredPlans = _configuration
            .GetSection("Subscriptions:Plans")
            .Get<List<SubscriptionPlanDto>>();

        if (configuredPlans != null && configuredPlans.Count > 0)
        {
            return Ok(configuredPlans);
        }

        var defaults = new List<SubscriptionPlanDto>
        {
            new()
            {
                Id = "starter",
                Name = "Starter",
                Price = 19.9m,
                Interval = "month",
                Highlighted = false,
                Features = new List<string> { "Frete com desconto", "Ofertas semanais" }
            },
            new()
            {
                Id = "pro",
                Name = "Pro",
                Price = 49.9m,
                Interval = "month",
                Highlighted = true,
                Features = new List<string> { "Frete gratis", "Suporte prioritario", "Cashback aumentado" }
            },
            new()
            {
                Id = "elite",
                Name = "Elite",
                Price = 99.9m,
                Interval = "month",
                Highlighted = false,
                Features = new List<string> { "Frete expresso gratis", "Ofertas exclusivas", "Atendimento dedicado" }
            }
        };

        return Ok(defaults);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] SubscriptionRequest request)
    {
        try
        {
            var subscription = await _service.CreateSubscriptionAsync(request.Plan, request.Email);
            return Ok(subscription);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id)
    {
        try
        {
            var subscription = await _service.GetSubscriptionAsync(id);
            return Ok(subscription);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var cancelled = await _service.CancelSubscriptionAsync(id);
            return Ok(cancelled);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/retry")]
    [Authorize]
    public async Task<IActionResult> Retry(Guid id)
    {
        try
        {
            var subscription = await _service.RetryBillingAsync(id);
            return Ok(subscription);
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

    [HttpPost("billing/run")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RunDueBilling([FromQuery] int batchSize = 100)
    {
        var result = await _service.ProcessDueBillingsAsync(batchSize);
        return Ok(result);
    }

    [HttpPost("webhooks/billing")]
    [AllowAnonymous]
    public async Task<IActionResult> BillingWebhook([FromBody] BillingWebhookRequest request)
    {
        var secret = _configuration["Subscriptions:Billing:WebhookSecret"];
        if (!string.IsNullOrWhiteSpace(secret))
        {
            var provided = Request.Headers["x-subscription-webhook-secret"].FirstOrDefault();
            if (!string.Equals(secret, provided, StringComparison.Ordinal))
            {
                return Unauthorized(new { message = "Invalid webhook secret" });
            }
        }

        var handled = await _service.HandleBillingWebhookAsync(
            new SubscriptionService.SubscriptionWebhookEvent(
                request.SubscriptionId,
                request.Event,
                request.TransactionId,
                request.Error,
                request.OccurredAt));

        if (!handled)
        {
            return NotFound(new { message = "Subscription not found or unsupported event" });
        }

        return Ok(new { success = true });
    }

    public record SubscriptionRequest(string Plan, string Email);

    public record BillingWebhookRequest(
        Guid SubscriptionId,
        string Event,
        string? TransactionId,
        string? Error,
        DateTime? OccurredAt);

    public class SubscriptionPlanDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Interval { get; set; } = "month";
        public bool Highlighted { get; set; }
        public List<string> Features { get; set; } = new();
    }
}
