using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Ecommerce.Application.Repositories;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class SessionsController : ControllerBase
{
    private readonly IRefreshTokenRepository _refreshTokenRepository;

    public SessionsController(IRefreshTokenRepository refreshTokenRepository)
    {
        _refreshTokenRepository = refreshTokenRepository;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var now = DateTime.UtcNow;
        var tokens = await _refreshTokenRepository.GetActiveByUserIdAsync(userId, now);
        var result = tokens.Select(t => new {
            id = t.Id,
            token = t.Token.Length > 8 ? t.Token.Substring(0, 8) + "..." : t.Token,
            userId = t.UserId,
            createdAt = t.CreatedAt,
            expiresAt = t.ExpiresAt,
            revokedAt = t.RevokedAt
        });
        return Ok(new { items = result });
    }

    [HttpPost("user/{userId}/revoke-all")]
    public async Task<IActionResult> RevokeAll(Guid userId)
    {
        await _refreshTokenRepository.RevokeAllForUserAsync(userId, DateTime.UtcNow);
        return Ok(new { message = "All sessions revoked" });
    }

    [HttpPost("revoke")]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequest req)
    {
        if (string.IsNullOrWhiteSpace(req?.Token)) return BadRequest(new { message = "Token is required" });
        var existing = await _refreshTokenRepository.GetByTokenAsync(req.Token);
        if (existing == null) return NotFound(new { message = "Token not found" });
        existing.RevokedAt = DateTime.UtcNow;
        await _refreshTokenRepository.UpdateAsync(existing);
        return Ok(new { message = "Token revoked" });
    }

}

public class RevokeTokenRequest
{
    public string? Token { get; set; }
}
