using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/auth/2fa")]
public class TwoFactorAuthController : ControllerBase
{
    private readonly TwoFactorService _service;

    public TwoFactorAuthController(TwoFactorService service)
        => _service = service;

    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupRequest request)
    {
        var result = await _service.SetupAsync(request.UserId, request.Email);

        return Ok(new
        {
            sessionId = result.sessionId,
            secret = result.secret,
            otpauthUrl = result.otpauthUrl,
            recoveryCodes = result.recoveryCodes
        });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request)
    {
        if (!await _service.VerifySessionAsync(request.SessionId, request.Code))
        {
            return BadRequest(new { message = "Invalid code" });
        }

        return Ok(new { message = "Code verified" });
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmRequest request)
    {
        if (!await _service.ConfirmAsync(request.SessionId))
        {
            return BadRequest(new { message = "Invalid session" });
        }

        return Ok(new { message = "2FA enabled" });
    }

    [HttpPost("challenge")]
    public async Task<IActionResult> Challenge([FromBody] ChallengeRequest request)
    {
        var challengeId = await _service.CreateChallengeAsync(request.UserId);
        if (challengeId == null)
        {
            return BadRequest(new { message = "2FA not enabled" });
        }

        return Ok(new { challengeId });
    }

    [HttpPost("challenge/verify")]
    public async Task<IActionResult> VerifyChallenge([FromBody] ChallengeVerifyRequest request)
    {
        if (!await _service.VerifyChallengeAsync(request.UserId, request.ChallengeId, request.Code))
        {
            return BadRequest(new { message = "Invalid code" });
        }

        return Ok(new { message = "Challenge verified" });
    }

    [HttpDelete]
    public async Task<IActionResult> Disable([FromBody] DisableRequest request)
    {
        await _service.DisableAsync(request.UserId);

        return Ok(new { message = "2FA disabled" });
    }

    [HttpPost("recovery-codes/regenerate")]
    public async Task<IActionResult> RegenerateRecoveryCodes([FromBody] RegenerateRequest request)
    {
        var codes = await _service.RegenerateRecoveryCodesAsync(request.UserId);
        if (codes == null)
        {
            return BadRequest(new { message = "2FA not enabled" });
        }

        return Ok(new { recoveryCodes = codes });
    }

    public record SetupRequest(Guid UserId, string Email);
    public record VerifyRequest(Guid SessionId, string Code);
    public record ConfirmRequest(Guid SessionId);
    public record ChallengeRequest(Guid UserId);
    public record ChallengeVerifyRequest(Guid UserId, Guid ChallengeId, string Code);
    public record DisableRequest(Guid UserId);
    public record RegenerateRequest(Guid UserId);
}
