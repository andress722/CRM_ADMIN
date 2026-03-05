using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.Application.Repositories;
using System.Text;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/crm")]
[Route("admin/crm")]
public class CrmController : ControllerBase
{
    private readonly CrmService _service;
    private readonly UserService _userService;
    private readonly ProductService _productService;
    private readonly IAnalyticsEventRepository _analyticsEvents;
    private readonly IEmailService _emailService;
    private readonly AdminReportService _adminReportService;

    public CrmController(
        CrmService service,
        UserService userService,
        ProductService productService,
        IAnalyticsEventRepository analyticsEvents,
        IEmailService emailService,
        AdminReportService adminReportService)
    {
        _service = service;
        _userService = userService;
        _productService = productService;
        _analyticsEvents = analyticsEvents;
        _emailService = emailService;
        _adminReportService = adminReportService;
    }

    #region Leads

    [HttpGet("leads")]
    public async Task<IActionResult> GetLeads()
        => Ok(await _service.GetLeadsAsync());

    [HttpPost("leads")]
    public async Task<IActionResult> CreateLead([FromBody] CrmLeadCreateRequest request)
    {
        var lead = new CrmLead
        {
            Name = request.Name,
            Email = request.Email,
            Company = request.Company,
            Value = request.Value,
            Owner = request.Owner,
            Source = request.Source,
            Status = request.Status ?? "New",
            CreatedAt = ParseDateOrNow(request.CreatedAt)
        };

        var created = await _service.CreateLeadAsync(lead);
        return Ok(created);
    }

    [HttpGet("leads/{id}")]
    public async Task<IActionResult> GetLead(Guid id)
        => Ok(await _service.GetLeadAsync(id));

    [HttpPut("leads/{id}")]
    public async Task<IActionResult> ReplaceLead(Guid id, [FromBody] CrmLeadCreateRequest request)
    {
        var lead = await _service.GetLeadAsync(id);
        lead.Name = request.Name;
        lead.Email = request.Email;
        lead.Company = request.Company;
        lead.Value = request.Value;
        lead.Owner = request.Owner;
        lead.Source = request.Source;
        lead.Status = request.Status ?? lead.Status;
        lead.CreatedAt = ParseDateOrNow(request.CreatedAt, lead.CreatedAt);

        return Ok(await _service.UpdateLeadAsync(lead));
    }

    [HttpPatch("leads/{id}")]
    public async Task<IActionResult> UpdateLead(Guid id, [FromBody] CrmLeadUpdateRequest request)
    {
        var lead = await _service.GetLeadAsync(id);

        if (request.Name != null) lead.Name = request.Name;
        if (request.Email != null) lead.Email = request.Email;
        if (request.Company != null) lead.Company = request.Company;
        if (request.Value.HasValue) lead.Value = request.Value.Value;
        if (request.Owner != null) lead.Owner = request.Owner;
        if (request.Source != null) lead.Source = request.Source;
        if (request.Status != null) lead.Status = request.Status;
        if (request.CreatedAt != null) lead.CreatedAt = ParseDateOrNow(request.CreatedAt, lead.CreatedAt);

        return Ok(await _service.UpdateLeadAsync(lead));
    }

    [HttpDelete("leads/{id}")]
    public async Task<IActionResult> DeleteLead(Guid id)
    {
        await _service.DeleteLeadAsync(id);
        return NoContent();
    }

    #endregion

    #region Deals

    [HttpGet("deals")]
    public async Task<IActionResult> GetDeals()
        => Ok(await _service.GetDealsAsync());

    [HttpPost("deals")]
    public async Task<IActionResult> CreateDeal([FromBody] CrmDealCreateRequest request)
    {
        var deal = new CrmDeal
        {
            Title = request.Title,
            Company = request.Company,
            Owner = request.Owner,
            Value = request.Value,
            Stage = request.Stage ?? "Prospecting",
            Probability = request.Probability ?? 0,
            ExpectedClose = ParseDate(request.ExpectedClose)
        };

        var created = await _service.CreateDealAsync(deal);
        return Ok(created);
    }

    [HttpGet("deals/{id}")]
    public async Task<IActionResult> GetDeal(Guid id)
        => Ok(await _service.GetDealAsync(id));

    [HttpPut("deals/{id}")]
    public async Task<IActionResult> ReplaceDeal(Guid id, [FromBody] CrmDealCreateRequest request)
    {
        var deal = await _service.GetDealAsync(id);
        deal.Title = request.Title;
        deal.Company = request.Company;
        deal.Owner = request.Owner;
        deal.Value = request.Value;
        deal.Stage = request.Stage ?? deal.Stage;
        deal.Probability = request.Probability ?? deal.Probability;
        deal.ExpectedClose = ParseDate(request.ExpectedClose) ?? deal.ExpectedClose;

        return Ok(await _service.UpdateDealAsync(deal));
    }

    [HttpPatch("deals/{id}")]
    public async Task<IActionResult> UpdateDeal(Guid id, [FromBody] CrmDealUpdateRequest request)
    {
        var deal = await _service.GetDealAsync(id);

        if (request.Title != null) deal.Title = request.Title;
        if (request.Company != null) deal.Company = request.Company;
        if (request.Owner != null) deal.Owner = request.Owner;
        if (request.Value.HasValue) deal.Value = request.Value.Value;
        if (request.Stage != null) deal.Stage = request.Stage;
        if (request.Probability.HasValue) deal.Probability = request.Probability.Value;
        if (request.ExpectedClose != null) deal.ExpectedClose = ParseDate(request.ExpectedClose) ?? deal.ExpectedClose;

        return Ok(await _service.UpdateDealAsync(deal));
    }

    [HttpDelete("deals/{id}")]
    public async Task<IActionResult> DeleteDeal(Guid id)
    {
        await _service.DeleteDealAsync(id);
        return NoContent();
    }

    #endregion

    #region Contacts

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts()
        => Ok(await _service.GetContactsAsync());

    [HttpPost("contacts")]
    public async Task<IActionResult> CreateContact([FromBody] CrmContactCreateRequest request)
    {
        var contact = new CrmContact
        {
            Name = request.Name,
            Email = request.Email,
            Company = request.Company,
            Owner = request.Owner,
            Segment = request.Segment ?? "New",
            Lifecycle = request.Lifecycle ?? "Lead",
            LastTouch = ParseDate(request.LastTouch),
            Notes = request.Notes ?? string.Empty
        };

        var created = await _service.CreateContactAsync(contact);
        return Ok(created);
    }

    [HttpGet("contacts/{id}")]
    public async Task<IActionResult> GetContact(Guid id)
        => Ok(await _service.GetContactAsync(id));

    [HttpPost("contacts/{id}/send-viewed-suggestions")]
    public async Task<IActionResult> SendViewedSuggestionsEmail(Guid id, [FromBody] SendViewedSuggestionsRequest? request)
    {
        var contact = await _service.GetContactAsync(id);
        var user = await _userService.GetUserByEmailAsync(contact.Email);
        if (user == null)
        {
            return NotFound(new { message = "No storefront user linked to this contact email." });
        }

        var limit = request?.Limit is > 0 and <= 20 ? request.Limit.Value : 5;
        var events = await _analyticsEvents.GetSinceAsync(DateTime.UtcNow.AddDays(-180));
        var viewed = events
            .Where(e => e.UserId == user.Id && e.Type.Equals("ProductView", StringComparison.OrdinalIgnoreCase))
            .Where(e => Guid.TryParse(e.Label, out _))
            .GroupBy(e => Guid.Parse(e.Label!))
            .Select(g => new { ProductId = g.Key, Views = g.Count(), LastSeenAt = g.Max(x => x.CreatedAt) })
            .OrderByDescending(x => x.Views)
            .ThenByDescending(x => x.LastSeenAt)
            .Take(limit)
            .ToList();

        if (viewed.Count == 0)
        {
            return BadRequest(new { message = "This user has no viewed products yet." });
        }

        var products = new List<(string Name, decimal Price, string Category)>();
        foreach (var item in viewed)
        {
            try
            {
                var product = await _productService.GetProductAsync(item.ProductId);
                products.Add((product.Name, product.Price, product.Category));
            }
            catch
            {
                // Ignore deleted products
            }
        }

        if (products.Count == 0)
        {
            return BadRequest(new { message = "Viewed products no longer exist in catalog." });
        }

        var subject = string.IsNullOrWhiteSpace(request?.Subject)
            ? "Sugestoes baseadas no que voce viu"
            : request!.Subject!.Trim();

        var intro = string.IsNullOrWhiteSpace(request?.Intro)
            ? "Selecionamos alguns itens com base nos produtos que voce visualizou recentemente:"
            : request!.Intro!.Trim();

        var htmlBuilder = new StringBuilder();
        htmlBuilder.Append("<div style='font-family:Arial,sans-serif'>");
        htmlBuilder.Append($"<p>{System.Net.WebUtility.HtmlEncode(intro)}</p><ul>");
        foreach (var product in products)
        {
            htmlBuilder.Append($"<li><strong>{System.Net.WebUtility.HtmlEncode(product.Name)}</strong> - {product.Price:C} ({System.Net.WebUtility.HtmlEncode(product.Category)})</li>");
        }
        htmlBuilder.Append("</ul><p>Visite nossa loja para conferir.</p></div>");

        var textBuilder = new StringBuilder();
        textBuilder.AppendLine(intro);
        foreach (var product in products)
        {
            textBuilder.AppendLine($"- {product.Name} | {product.Price:C} | {product.Category}");
        }

        await _emailService.SendCustomEmailAsync(contact.Email, subject, htmlBuilder.ToString(), textBuilder.ToString());

        return Ok(new { message = "Suggestion email sent", to = contact.Email, suggestedCount = products.Count });
    }

    [HttpPut("contacts/{id}")]
    public async Task<IActionResult> ReplaceContact(Guid id, [FromBody] CrmContactCreateRequest request)
    {
        var contact = await _service.GetContactAsync(id);
        contact.Name = request.Name;
        contact.Email = request.Email;
        contact.Company = request.Company;
        contact.Owner = request.Owner;
        contact.Segment = request.Segment ?? contact.Segment;
        contact.Lifecycle = request.Lifecycle ?? contact.Lifecycle;
        contact.LastTouch = ParseDate(request.LastTouch) ?? contact.LastTouch;
        contact.Notes = request.Notes ?? contact.Notes;

        return Ok(await _service.UpdateContactAsync(contact));
    }

    [HttpPatch("contacts/{id}")]
    public async Task<IActionResult> UpdateContact(Guid id, [FromBody] CrmContactUpdateRequest request)
    {
        var contact = await _service.GetContactAsync(id);

        if (request.Name != null) contact.Name = request.Name;
        if (request.Email != null) contact.Email = request.Email;
        if (request.Company != null) contact.Company = request.Company;
        if (request.Owner != null) contact.Owner = request.Owner;
        if (request.Segment != null) contact.Segment = request.Segment;
        if (request.Lifecycle != null) contact.Lifecycle = request.Lifecycle;
        if (request.LastTouch != null) contact.LastTouch = ParseDate(request.LastTouch) ?? contact.LastTouch;
        if (request.Notes != null) contact.Notes = request.Notes;

        return Ok(await _service.UpdateContactAsync(contact));
    }

    [HttpDelete("contacts/{id}")]
    public async Task<IActionResult> DeleteContact(Guid id)
    {
        await _service.DeleteContactAsync(id);
        return NoContent();
    }

    [HttpGet("reports/overview")]
    public async Task<IActionResult> GetReportsOverview()
    {
        var report = await _adminReportService.BuildOverviewAsync();
        return Ok(report);
    }

    [HttpPost("reports/overview/email")]
    public async Task<IActionResult> SendReportsOverviewEmail([FromBody] CrmSendOverviewReportEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.To))
        {
            return BadRequest(new { message = "Destination email is required." });
        }

        var report = await _adminReportService.BuildOverviewAsync();
        var subject = string.IsNullOrWhiteSpace(request.Subject)
            ? $"CRM relatorio ecommerce - {DateTime.UtcNow:yyyy-MM-dd}"
            : request.Subject!.Trim();

        var html = _adminReportService.BuildOverviewEmailHtml(report);
        var text = _adminReportService.BuildOverviewEmailText(report);

        await _emailService.SendCustomEmailAsync(request.To.Trim(), subject, html, text);

        return Ok(new { message = "Overview report email sent", to = request.To.Trim(), subject });
    }

    #endregion

    #region Activities

    [HttpGet("activities")]
    public async Task<IActionResult> GetActivities()
        => Ok(await _service.GetActivitiesAsync());

    [HttpPost("activities")]
    public async Task<IActionResult> CreateActivity([FromBody] CrmActivityCreateRequest request)
    {
        var activity = new CrmActivity
        {
            Subject = request.Subject,
            Owner = request.Owner,
            Contact = request.Contact,
            Type = request.Type,
            Status = request.Status ?? "Open",
            DueDate = ParseDate(request.DueDate),
            Notes = request.Notes ?? string.Empty
        };

        var created = await _service.CreateActivityAsync(activity);
        return Ok(created);
    }

    [HttpGet("activities/{id}")]
    public async Task<IActionResult> GetActivity(Guid id)
        => Ok(await _service.GetActivityAsync(id));

    [HttpPut("activities/{id}")]
    public async Task<IActionResult> ReplaceActivity(Guid id, [FromBody] CrmActivityCreateRequest request)
    {
        var activity = await _service.GetActivityAsync(id);
        activity.Subject = request.Subject;
        activity.Owner = request.Owner;
        activity.Contact = request.Contact;
        activity.Type = request.Type;
        activity.Status = request.Status ?? activity.Status;
        activity.DueDate = ParseDate(request.DueDate) ?? activity.DueDate;
        activity.Notes = request.Notes ?? activity.Notes;

        return Ok(await _service.UpdateActivityAsync(activity));
    }

    [HttpPatch("activities/{id}")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] CrmActivityUpdateRequest request)
    {
        var activity = await _service.GetActivityAsync(id);

        if (request.Subject != null) activity.Subject = request.Subject;
        if (request.Owner != null) activity.Owner = request.Owner;
        if (request.Contact != null) activity.Contact = request.Contact;
        if (request.Type != null) activity.Type = request.Type;
        if (request.Status != null) activity.Status = request.Status;
        if (request.DueDate != null) activity.DueDate = ParseDate(request.DueDate) ?? activity.DueDate;
        if (request.Notes != null) activity.Notes = request.Notes;

        return Ok(await _service.UpdateActivityAsync(activity));
    }

    [HttpDelete("activities/{id}")]
    public async Task<IActionResult> DeleteActivity(Guid id)
    {
        await _service.DeleteActivityAsync(id);
        return NoContent();
    }

    #endregion

    private static DateTime ParseDateOrNow(string? date, DateTime? fallback = null)
    {
        if (string.IsNullOrWhiteSpace(date))
            return fallback ?? DateTime.UtcNow;

        return DateTime.TryParse(date, out var parsed) ? parsed : (fallback ?? DateTime.UtcNow);
    }

    private static DateTime? ParseDate(string? date)
    {
        if (string.IsNullOrWhiteSpace(date)) return null;
        return DateTime.TryParse(date, out var parsed) ? parsed : null;
    }
}

public record CrmLeadCreateRequest(
    string Name,
    string Email,
    string Company,
    decimal Value,
    string Owner,
    string Source,
    string? Status,
    string? CreatedAt);

public record CrmLeadUpdateRequest(
    string? Name,
    string? Email,
    string? Company,
    decimal? Value,
    string? Owner,
    string? Source,
    string? Status,
    string? CreatedAt);

public record CrmDealCreateRequest(
    string Title,
    string Company,
    string Owner,
    decimal Value,
    string? Stage,
    int? Probability,
    string? ExpectedClose);

public record CrmDealUpdateRequest(
    string? Title,
    string? Company,
    string? Owner,
    decimal? Value,
    string? Stage,
    int? Probability,
    string? ExpectedClose);

public record CrmContactCreateRequest(
    string Name,
    string Email,
    string Company,
    string Owner,
    string? Segment,
    string? Lifecycle,
    string? LastTouch,
    string? Notes);

public record CrmContactUpdateRequest(
    string? Name,
    string? Email,
    string? Company,
    string? Owner,
    string? Segment,
    string? Lifecycle,
    string? LastTouch,
    string? Notes);

public record CrmActivityCreateRequest(
    string Subject,
    string Owner,
    string Contact,
    string Type,
    string? Status,
    string? DueDate,
    string? Notes);

public record CrmActivityUpdateRequest(
    string? Subject,
    string? Owner,
    string? Contact,
    string? Type,
    string? Status,
    string? DueDate,
    string? Notes);








public record SendViewedSuggestionsRequest(int? Limit, string? Subject, string? Intro);
public record CrmSendOverviewReportEmailRequest(string To, string? Subject);







