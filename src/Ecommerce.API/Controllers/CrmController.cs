using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.Application.Repositories;
using Ecommerce.API.Services;
using System.Text;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Manager,Seller")]
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
    private readonly IAuditLogService _auditLogService;

    public CrmController(
        CrmService service,
        UserService userService,
        ProductService productService,
        IAnalyticsEventRepository analyticsEvents,
        IEmailService emailService,
        AdminReportService adminReportService,
        IAuditLogService auditLogService)
    {
        _service = service;
        _userService = userService;
        _productService = productService;
        _analyticsEvents = analyticsEvents;
        _emailService = emailService;
        _adminReportService = adminReportService;
        _auditLogService = auditLogService;
    }

    #region Leads

    [HttpGet("leads")]
    public async Task<IActionResult> GetLeads()
        => Ok(await _service.GetLeadsAsync());

        [HttpPost("leads")]
    public async Task<IActionResult> CreateLead([FromBody] CrmLeadCreateRequest request)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 2)
        {
            return BadRequest(new { message = "Lead name must have at least 2 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new { message = "Lead email is invalid." });
        }

        if (string.IsNullOrWhiteSpace(request.Company))
        {
            return BadRequest(new { message = "Lead company is required." });
        }

        if (request.Value < 0)
        {
            return BadRequest(new { message = "Lead value cannot be negative." });
        }

        if (string.IsNullOrWhiteSpace(request.Owner) || string.IsNullOrWhiteSpace(request.Source))
        {
            return BadRequest(new { message = "Lead owner and source are required." });
        }

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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var lead = await _service.GetLeadAsync(id);
        lead.Status = "Archived";
        await _service.UpdateLeadAsync(lead);
        await WriteAuditAsync("crm.lead.archive", "CrmLead", id.ToString(), new { lead.Name, lead.Email, lead.Company });
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Deal title is required." });
        }

        if (request.Value < 0)
        {
            return BadRequest(new { message = "Deal value cannot be negative." });
        }

        if (request.Probability is < 0 or > 100)
        {
            return BadRequest(new { message = "Deal probability must be between 0 and 100." });
        }

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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var deal = await _service.GetDealAsync(id);
        deal.Stage = "Archived";
        await _service.UpdateDealAsync(deal);
        await WriteAuditAsync("crm.deal.archive", "CrmDeal", id.ToString(), new { deal.Title, deal.Company });
        return NoContent();
    }

        #endregion

    #region Companies

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var leads = (await _service.GetLeadsAsync()).ToList();
        var deals = (await _service.GetDealsAsync()).ToList();
        var contacts = (await _service.GetContactsAsync()).ToList();

        var companies = leads.Select(x => x.Company)
            .Concat(deals.Select(x => x.Company))
            .Concat(contacts.Select(x => x.Company))
            .Select(x => (x ?? string.Empty).Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(name => new
            {
                name,
                contacts = contacts.Count(c => string.Equals(c.Company, name, StringComparison.OrdinalIgnoreCase)),
                leads = leads.Count(l => string.Equals(l.Company, name, StringComparison.OrdinalIgnoreCase) && !string.Equals(l.Status, "Archived", StringComparison.OrdinalIgnoreCase)),
                opportunities = deals.Count(d => string.Equals(d.Company, name, StringComparison.OrdinalIgnoreCase) && !string.Equals(d.Stage, "Archived", StringComparison.OrdinalIgnoreCase)),
                pipelineValue = deals.Where(d => string.Equals(d.Company, name, StringComparison.OrdinalIgnoreCase) && !string.Equals(d.Stage, "Lost", StringComparison.OrdinalIgnoreCase)).Sum(d => d.Value),
                owner = contacts.FirstOrDefault(c => string.Equals(c.Company, name, StringComparison.OrdinalIgnoreCase))?.Owner
                    ?? leads.FirstOrDefault(l => string.Equals(l.Company, name, StringComparison.OrdinalIgnoreCase))?.Owner
                    ?? deals.FirstOrDefault(d => string.Equals(d.Company, name, StringComparison.OrdinalIgnoreCase))?.Owner
                    ?? "CRM"
            })
            .OrderBy(x => x.name)
            .ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            companies = companies
                .Where(x => x.name.Contains(search.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var total = companies.Count;
        var data = companies.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new
        {
            data,
            pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling(total / (double)pageSize) }
        });
    }

    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CrmCompanyCreateRequest request)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var name = (request.Name ?? string.Empty).Trim();
        if (name.Length < 2)
        {
            return BadRequest(new { message = "Company name must have at least 2 characters." });
        }

        var existing = (await _service.GetContactsAsync())
            .Any(c => string.Equals(c.Company, name, StringComparison.OrdinalIgnoreCase));
        if (!existing)
        {
            var placeholder = new CrmContact
            {
                Name = $"Primary contact - {name}",
                Email = $"company+{Guid.NewGuid():N}@local.crm",
                Company = name,
                Owner = string.IsNullOrWhiteSpace(request.Owner) ? "CRM" : request.Owner.Trim(),
                Segment = "New",
                Lifecycle = "Lead",
                Notes = request.Notes ?? "Auto-created company record"
            };
            await _service.CreateContactAsync(placeholder);
        }

        await WriteAuditAsync("crm.company.create", "CrmCompany", name, new { name, request.Owner });
        return Ok(new { name, owner = request.Owner ?? "CRM" });
    }

    [HttpPatch("companies/rename")]
    public async Task<IActionResult> RenameCompany([FromBody] CrmCompanyRenameRequest request)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var from = (request.From ?? string.Empty).Trim();
        var to = (request.To ?? string.Empty).Trim();
        if (from.Length < 2 || to.Length < 2)
        {
            return BadRequest(new { message = "From/To company names are required." });
        }

        var leads = (await _service.GetLeadsAsync()).Where(x => string.Equals(x.Company, from, StringComparison.OrdinalIgnoreCase)).ToList();
        var deals = (await _service.GetDealsAsync()).Where(x => string.Equals(x.Company, from, StringComparison.OrdinalIgnoreCase)).ToList();
        var contacts = (await _service.GetContactsAsync()).Where(x => string.Equals(x.Company, from, StringComparison.OrdinalIgnoreCase)).ToList();

        foreach (var lead in leads) { lead.Company = to; await _service.UpdateLeadAsync(lead); }
        foreach (var deal in deals) { deal.Company = to; await _service.UpdateDealAsync(deal); }
        foreach (var contact in contacts) { contact.Company = to; await _service.UpdateContactAsync(contact); }

        await WriteAuditAsync("crm.company.rename", "CrmCompany", from, new { from, to, leads = leads.Count, deals = deals.Count, contacts = contacts.Count });
        return Ok(new { from, to, leads = leads.Count, deals = deals.Count, contacts = contacts.Count });
    }

    [HttpDelete("companies")]
    public async Task<IActionResult> DeleteCompany([FromQuery] string name, [FromQuery] string? reassignTo)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var normalized = (name ?? string.Empty).Trim();
        if (normalized.Length < 2)
        {
            return BadRequest(new { message = "Company name is required." });
        }

        var target = string.IsNullOrWhiteSpace(reassignTo) ? "Unassigned" : reassignTo.Trim();

        var leads = (await _service.GetLeadsAsync()).Where(x => string.Equals(x.Company, normalized, StringComparison.OrdinalIgnoreCase)).ToList();
        var deals = (await _service.GetDealsAsync()).Where(x => string.Equals(x.Company, normalized, StringComparison.OrdinalIgnoreCase)).ToList();
        var contacts = (await _service.GetContactsAsync()).Where(x => string.Equals(x.Company, normalized, StringComparison.OrdinalIgnoreCase)).ToList();

        foreach (var lead in leads) { lead.Company = target; await _service.UpdateLeadAsync(lead); }
        foreach (var deal in deals) { deal.Company = target; await _service.UpdateDealAsync(deal); }
        foreach (var contact in contacts) { contact.Company = target; await _service.UpdateContactAsync(contact); }

        await WriteAuditAsync("crm.company.delete", "CrmCompany", normalized, new { name = normalized, reassignTo = target, leads = leads.Count, deals = deals.Count, contacts = contacts.Count });
        return NoContent();
    }

    #endregion

    #region Proposals

    [HttpGet("proposals")]
    public async Task<IActionResult> GetProposals()
    {
        var proposals = (await _service.GetDealsAsync())
            .Where(d => string.Equals(d.Stage, "Proposal", StringComparison.OrdinalIgnoreCase)
                || string.Equals(d.Stage, "Negotiation", StringComparison.OrdinalIgnoreCase)
                || string.Equals(d.Stage, "Won", StringComparison.OrdinalIgnoreCase)
                || string.Equals(d.Stage, "Lost", StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Ok(proposals);
    }

    [HttpPost("proposals")]
    public async Task<IActionResult> CreateProposal([FromBody] CrmProposalCreateRequest request)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Company))
        {
            return BadRequest(new { message = "Proposal title and company are required." });
        }

        var deal = new CrmDeal
        {
            Title = request.Title.Trim(),
            Company = request.Company.Trim(),
            Owner = string.IsNullOrWhiteSpace(request.Owner) ? "CRM" : request.Owner.Trim(),
            Value = Math.Max(0, request.Value),
            Stage = string.IsNullOrWhiteSpace(request.Status) ? "Proposal" : request.Status.Trim(),
            Probability = request.Probability is < 0 or > 100 ? 50 : request.Probability,
            ExpectedClose = ParseDate(request.ValidUntil)
        };

        var created = await _service.CreateDealAsync(deal);
        await WriteAuditAsync("crm.proposal.create", "CrmProposal", created.Id.ToString(), new { created.Title, created.Company, created.Value, created.Stage });
        return Ok(created);
    }

    [HttpPatch("proposals/{id}")]
    public async Task<IActionResult> UpdateProposal(Guid id, [FromBody] CrmProposalUpdateRequest request)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var deal = await _service.GetDealAsync(id);

        if (request.Title != null) deal.Title = request.Title;
        if (request.Company != null) deal.Company = request.Company;
        if (request.Owner != null) deal.Owner = request.Owner;
        if (request.Value.HasValue) deal.Value = Math.Max(0, request.Value.Value);
        if (request.Status != null) deal.Stage = request.Status;
        if (request.Probability.HasValue) deal.Probability = Math.Clamp(request.Probability.Value, 0, 100);
        if (request.ValidUntil != null) deal.ExpectedClose = ParseDate(request.ValidUntil) ?? deal.ExpectedClose;

        var updated = await _service.UpdateDealAsync(deal);
        await WriteAuditAsync("crm.proposal.update", "CrmProposal", id.ToString(), new { updated.Title, updated.Company, updated.Value, updated.Stage });
        return Ok(updated);
    }

    [HttpDelete("proposals/{id}")]
    public async Task<IActionResult> DeleteProposal(Guid id)
    {
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var deal = await _service.GetDealAsync(id);
        deal.Stage = "Archived";
        await _service.UpdateDealAsync(deal);

        await WriteAuditAsync("crm.proposal.archive", "CrmProposal", id.ToString(), new { deal.Title, deal.Company });
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var contact = await _service.GetContactAsync(id);
        contact.Lifecycle = "Archived";
        await _service.UpdateContactAsync(contact);
        await WriteAuditAsync("crm.contact.archive", "CrmContact", id.ToString(), new { contact.Name, contact.Email, contact.Company });
        return NoContent();
    }

    [HttpGet("reports/rfm")]
    public async Task<IActionResult> GetRfmReport([FromQuery] int top = 200)
    {
        top = Math.Clamp(top, 1, 1000);

        var orders = (await _service.GetDealsAsync()).ToList();
        var users = (await _userService.GetAllUsersAsync()).ToList();
        var userOrders = (await HttpContext.RequestServices.GetRequiredService<OrderService>().GetAllOrdersAsync()).ToList();

        var now = DateTime.UtcNow;
        var rows = users.Select(u =>
        {
            var uo = userOrders.Where(o => o.UserId == u.Id).ToList();
            var recencyDays = uo.Count == 0 ? 9999 : (int)(now - uo.Max(x => x.CreatedAt)).TotalDays;
            var frequency = uo.Count;
            var monetary = uo.Sum(x => x.TotalAmount);

            var segment = recencyDays <= 30 && frequency >= 3 && monetary >= 500 ? "Champions"
                : recencyDays <= 60 && frequency >= 2 ? "Loyal"
                : recencyDays > 120 && frequency <= 1 ? "AtRisk"
                : "Potential";

            return new
            {
                userId = u.Id,
                email = u.Email,
                name = u.FullName,
                recencyDays,
                frequency,
                monetary,
                segment
            };
        })
        .OrderByDescending(x => x.monetary)
        .Take(top)
        .ToList();

        return Ok(rows);
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
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
        var guard = EnsureCanMutate();
        if (guard != null) return guard;
        var activity = await _service.GetActivityAsync(id);
        activity.Status = "Archived";
        await _service.UpdateActivityAsync(activity);
        await WriteAuditAsync("crm.activity.archive", "CrmActivity", id.ToString(), new { activity.Subject, activity.Contact });
        return NoContent();
    }

    #endregion


    private IActionResult? EnsureCanMutate()
    {
        if (User.IsInRole("Seller") && !User.IsInRole("Admin") && !User.IsInRole("Manager"))
        {
            return Forbid();
        }

        return null;
    }
    private async Task WriteAuditAsync(string action, string entityType, string? entityId, object? metadata)
    {
        var actorEmail = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? "admin@local";

        Guid? actorUserId = null;
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(sub, out var parsed)) actorUserId = parsed;

        await _auditLogService.WriteAsync(
            actorUserId,
            actorEmail,
            action,
            entityType,
            entityId,
            metadata,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(),
            HttpContext.RequestAborted);
    }
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








public record CrmCompanyCreateRequest(
    string Name,
    string? Owner,
    string? Notes);

public record CrmCompanyRenameRequest(
    string From,
    string To);

public record CrmProposalCreateRequest(
    string Title,
    string Company,
    string? Owner,
    decimal Value,
    string? Status,
    int Probability,
    string? ValidUntil);

public record CrmProposalUpdateRequest(
    string? Title,
    string? Company,
    string? Owner,
    decimal? Value,
    string? Status,
    int? Probability,
    string? ValidUntil);
public record SendViewedSuggestionsRequest(int? Limit, string? Subject, string? Intro);
public record CrmSendOverviewReportEmailRequest(string To, string? Subject);





















