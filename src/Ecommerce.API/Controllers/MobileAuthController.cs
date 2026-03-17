using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Ecommerce.API.Services;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/auth/mobile")]
public class MobileAuthController : ControllerBase
{
    private readonly UserService _userService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly AuthService _authService;
    private readonly IRequestThrottleService _throttle;
    private readonly IConfiguration _configuration;

    public MobileAuthController(
        UserService userService,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IPasswordHasher<User> passwordHasher,
        AuthService authService,
        IRequestThrottleService throttle,
        IConfiguration configuration)
    {
        _userService = userService;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _authService = authService;
        _throttle = throttle;
        _configuration = configuration;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] MobileLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!_throttle.IsAllowed("auth:mobile:login:ip", ip, 20, TimeSpan.FromMinutes(1)))
        {
            return StatusCode(429, new { message = "Too many login attempts from this IP" });
        }

        if (!_throttle.IsAllowed("auth:mobile:login:user", request.Email.Trim().ToLowerInvariant(), 10, TimeSpan.FromMinutes(1)))
        {
            return StatusCode(429, new { message = "Too many login attempts for this user" });
        }

        var user = await _userService.GetUserByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        if (user.IsBlocked)
        {
            return StatusCode(403, new { message = "Account blocked" });
        }

        if (_authService.IsLockedOut(user))
        {
            return StatusCode(423, new { message = "Account locked. Try again later." });
        }

        var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            var maxAttempts = _configuration.GetValue("Auth:MaxFailedAttempts", 5);
            var lockoutMinutes = _configuration.GetValue("Auth:LockoutMinutes", 15);
            await _authService.RecordFailedLoginAsync(user, maxAttempts, lockoutMinutes);
            return Unauthorized(new { message = "Invalid email or password" });
        }

        await _authService.ResetLockoutAsync(user);

        if (!user.IsEmailVerified)
        {
            return StatusCode(403, new { message = "Email not verified" });
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _userService.UpdateUserAsync(user);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = _tokenService.GetRefreshTokenExpiryUtc()
        };

        await _refreshTokenRepository.AddAsync(refreshToken);

        return Ok(new MobileSessionResponse(
            accessToken,
            refreshTokenValue,
            refreshToken.ExpiresAt,
            new MobileUserResponse(user.Id, user.Email, user.FullName, user.Role)));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] MobileRefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { message = "Refresh token is required" });
        }

        var storedToken = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken.Trim());
        if (storedToken == null)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }

        if (storedToken.IsRevoked)
        {
            await _refreshTokenRepository.RevokeAllForUserAsync(storedToken.UserId, DateTime.UtcNow);
            return Unauthorized(new { message = "Refresh token reuse detected. All sessions revoked." });
        }

        if (storedToken.IsExpired)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }

        var user = await _userService.GetUserAsync(storedToken.UserId);
        if (user.IsBlocked)
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(storedToken);
            return StatusCode(403, new { message = "Account blocked" });
        }

        storedToken.RevokedAt = DateTime.UtcNow;
        await _refreshTokenRepository.UpdateAsync(storedToken);

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = newRefreshToken,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = _tokenService.GetRefreshTokenExpiryUtc()
        };

        await _refreshTokenRepository.AddAsync(newRefreshTokenEntity);

        return Ok(new MobileSessionResponse(
            newAccessToken,
            newRefreshToken,
            newRefreshTokenEntity.ExpiresAt,
            new MobileUserResponse(user.Id, user.Email, user.FullName, user.Role)));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] MobileRefreshRequest request)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userId))
        {
            return Unauthorized();
        }

        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var stored = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken.Trim());
            if (stored != null && stored.UserId == userId)
            {
                stored.RevokedAt = DateTime.UtcNow;
                await _refreshTokenRepository.UpdateAsync(stored);
            }
        }
        else
        {
            await _refreshTokenRepository.RevokeAllForUserAsync(userId, DateTime.UtcNow);
        }

        return Ok(new { message = "Logged out" });
    }

    public sealed record MobileLoginRequest(string Email, string Password);
    public sealed record MobileRefreshRequest(string? RefreshToken);
    public sealed record MobileSessionResponse(string AccessToken, string RefreshToken, DateTimeOffset RefreshTokenExpiresAt, MobileUserResponse User);
    public sealed record MobileUserResponse(Guid Id, string Email, string Name, string Role);
}
