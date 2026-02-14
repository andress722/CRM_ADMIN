using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/support")]
public class SupportController : ControllerBase
{
    private readonly SupportService _service;

    public SupportController(SupportService service)
        => _service = service;

    [HttpPost("tickets")]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] SupportTicketRequest request)
    {
        try
        {
            var ticket = await _service.CreateTicketAsync(request.Email, request.Subject, request.Message);
            return Ok(new { id = ticket.Id, status = ticket.Status });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tickets")]
    [Authorize]
    public async Task<IActionResult> List()
    {
        var tickets = await _service.GetTicketsAsync();
        return Ok(tickets);
    }

    [HttpGet("tickets/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Get(Guid id)
    {
        try
        {
            var ticket = await _service.GetTicketAsync(id);
            return Ok(ticket);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPatch("tickets/{id:guid}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateSupportStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
            return BadRequest(new { message = "Status is required" });

        try
        {
            var ticket = await _service.UpdateStatusAsync(id, request.Status.Trim());
            return Ok(ticket);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    public record SupportTicketRequest(string Email, string Subject, string Message);
    public record UpdateSupportStatusRequest(string Status);
}
