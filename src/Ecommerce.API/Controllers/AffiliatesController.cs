using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/affiliates")]
public class AffiliatesController : ControllerBase
{
    private readonly AffiliateService _service;

    public AffiliatesController(AffiliateService service)
        => _service = service;

    [HttpPost("partners")]
    [Authorize]
    public async Task<IActionResult> RegisterPartner([FromBody] RegisterAffiliateRequest request)
    {
        try
        {
            var partner = await _service.RegisterPartnerAsync(request.Email, request.CommissionRate ?? 0.1m);
            return Ok(new { partner.Id, partner.Code, partner.Email, partner.CommissionRate, partner.CreatedAt });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("partners/{code}")]
    [Authorize]
    public async Task<IActionResult> GetPartner(string code)
    {
        try
        {
            var partner = await _service.GetPartnerByCodeAsync(code);
            return Ok(new { partner.Id, partner.Code, partner.Email, partner.CommissionRate, partner.IsActive, partner.CreatedAt });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("partners/{code}/conversions")]
    [Authorize]
    public async Task<IActionResult> GetConversions(string code)
    {
        try
        {
            var conversions = await _service.GetConversionsAsync(code);
            return Ok(conversions);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("conversions")]
    [Authorize]
    public async Task<IActionResult> CreateConversion([FromBody] CreateAffiliateConversionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefCode))
            return BadRequest(new { message = "RefCode is required" });

        try
        {
            var conversion = await _service.CreateConversionAsync(request.RefCode.Trim(), request.OrderId, request.Amount);
            return Ok(conversion);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("conversions/{id:guid}/pay")]
    [Authorize]
    public async Task<IActionResult> PayConversion(Guid id)
    {
        try
        {
            var conversion = await _service.MarkConversionPaidAsync(id);
            return Ok(conversion);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    public record RegisterAffiliateRequest(string Email, decimal? CommissionRate);
    public record CreateAffiliateConversionRequest(string RefCode, Guid OrderId, decimal Amount);
}
