using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Ecommerce.API.Services;
using Ecommerce.Application.Repositories;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controller for authentication
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserService _userService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly AuthService _authService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly SocialAuthService _socialAuthService;

    public AuthController(
        UserService userService,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IPasswordHasher<User> passwordHasher,
        AuthService authService,
        IEmailService emailService,
        IConfiguration configuration,
        SocialAuthService socialAuthService)
    {
        _userService = userService;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _authService = authService;
        _emailService = emailService;
        _configuration = configuration;
        _socialAuthService = socialAuthService;
    }

    /// <summary>
    /// Get current user profile from access token
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var user = await _userService.GetUserAsync(userId);
            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.FullName,
                role = user.Role
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Logout and clear refresh cookie
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var cookie = Request.Cookies["refresh_token"];
            if (!string.IsNullOrWhiteSpace(cookie))
            {
                var stored = await _refreshTokenRepository.GetByTokenAsync(cookie);
                if (stored != null)
                {
                    stored.RevokedAt = DateTime.UtcNow;
                    await _refreshTokenRepository.UpdateAsync(stored);
                }
            }

            // Clear cookie
            Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });

            return Ok(new { message = "Logged out" });
        }
        catch
        {
            return StatusCode(500, new { message = "Failed to logout" });
        }
    }

    /// <summary>
    /// Login user with email and password
    /// </summary>
    /// <param name="request">Login credentials</param>
    /// <returns>Access token and user info</returns>
    /// <response code="200">Login successful</response>
    /// <response code="401">Invalid credentials</response>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        try
        {
            var user = await _userService.GetUserByEmailAsync(request.Email);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
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

            var token = _tokenService.GenerateAccessToken(user);
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

            // Set refresh token as HttpOnly cookie (rotating cookie strategy)
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps, // secure in production, allow insecure in dev
                SameSite = SameSiteMode.Lax,
                Expires = refreshToken.ExpiresAt,
                Path = "/"
            };
            Response.Cookies.Append("refresh_token", refreshTokenValue, cookieOptions);

            return Ok(new
            {
                accessToken = token,
                refreshToken = refreshTokenValue,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.FullName,
                    role = user.Role
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred during login", error = ex.Message });
        }
    }

    /// <summary>
    /// Social login (Google/Facebook)
    /// </summary>
    [HttpPost("social/{provider}")]
    [AllowAnonymous]
    public async Task<IActionResult> SocialLogin(string provider, [FromBody] SocialLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderUserId) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "ProviderUserId and email are required" });
        }

        try
        {
            var user = await _socialAuthService.AuthenticateAsync(provider, request.ProviderUserId, request.Email, request.Name);

            var token = _tokenService.GenerateAccessToken(user);
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

            // Set refresh token as HttpOnly cookie (rotating cookie strategy)
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps, // secure in production, allow insecure in dev
                SameSite = SameSiteMode.Lax,
                Expires = refreshToken.ExpiresAt,
                Path = "/"
            };
            Response.Cookies.Append("refresh_token", refreshTokenValue, cookieOptions);

            return Ok(new
            {
                accessToken = token,
                refreshToken = refreshTokenValue,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.FullName,
                    role = user.Role
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred during social login", error = ex.Message });
        }
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    /// <param name="request">Registration data</param>
    /// <returns>New user info</returns>
    /// <response code="201">User registered successfully</response>
    /// <response code="400">Registration failed</response>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        try
        {
            var existingUser = await _userService.GetUserByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "User with this email already exists" });
            }

            var passwordHash = _passwordHasher.HashPassword(new User(), request.Password);
            var user = await _userService.CreateUserAsync(request.Email, request.Name ?? "User", passwordHash);
            user.Role = "User";
            await _userService.UpdateUserAsync(user);

            var verificationTtlMinutes = _configuration.GetValue("Auth:EmailVerificationMinutes", 60);
            var verificationToken = await _authService.CreateEmailVerificationTokenAsync(user, TimeSpan.FromMinutes(verificationTtlMinutes));
            await _emailService.SendEmailVerificationAsync(user.Email, verificationToken.Token);

            var token = _tokenService.GenerateAccessToken(user);
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

            // Set refresh token as HttpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = refreshToken.ExpiresAt,
                Path = "/"
            };
            Response.Cookies.Append("refresh_token", refreshTokenValue, cookieOptions);

            return CreatedAtAction(nameof(Register), new
            {
                accessToken = token,
                refreshToken = refreshTokenValue,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.FullName,
                    role = user.Role
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred during registration", error = ex.Message });
        }
    }

    /// <summary>
    /// Verify email using token
    /// </summary>
    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new { message = "Token is required" });
        }

        var success = await _authService.VerifyEmailAsync(request.Token);
        if (!success)
        {
            return BadRequest(new { message = "Invalid or expired token" });
        }

        return Ok(new { message = "Email verified" });
    }

    /// <summary>
    /// Resend email verification token
    /// </summary>
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        var user = await _userService.GetUserByEmailAsync(request.Email);
        if (user == null)
        {
            return Ok(new { message = "If the email exists, a verification link was sent" });
        }

        var verificationTtlMinutes = _configuration.GetValue("Auth:EmailVerificationMinutes", 60);
        var verificationToken = await _authService.CreateEmailVerificationTokenAsync(user, TimeSpan.FromMinutes(verificationTtlMinutes));
        await _emailService.SendEmailVerificationAsync(user.Email, verificationToken.Token);

        return Ok(new { message = "Verification email sent" });
    }

    /// <summary>
    /// Request password reset
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        var user = await _userService.GetUserByEmailAsync(request.Email);
        if (user != null)
        {
            var resetTtlMinutes = _configuration.GetValue("Auth:PasswordResetMinutes", 30);
            var resetToken = await _authService.CreatePasswordResetTokenAsync(user, TimeSpan.FromMinutes(resetTtlMinutes));
            await _emailService.SendPasswordResetAsync(user.Email, resetToken.Token);
        }

        return Ok(new { message = "If the email exists, a reset link was sent" });
    }

    /// <summary>
    /// Reset password using token
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Token and new password are required" });
        }

        var success = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!success)
        {
            return BadRequest(new { message = "Invalid or expired token" });
        }

        return Ok(new { message = "Password updated" });
    }

    /// <summary>
    /// Refresh access token
    /// </summary>
    /// <param name="request">Refresh token request</param>
    /// <returns>New access token</returns>
    /// <response code="200">Token refreshed successfully</response>
    /// <response code="401">Invalid refresh token</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest? request)
    {
        // Read refresh token from HttpOnly cookie
        var refreshToken = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            refreshToken = Request.Cookies["refresh_token"];
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return BadRequest(new { message = "Refresh token is required" });
        }

        try
        {
            var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken);

            if (storedToken == null)
            {
                // token not found
                return Unauthorized(new { message = "Invalid or expired refresh token" });
            }

            if (storedToken.IsRevoked)
            {
                // Possible token reuse detected: revoke all tokens for this user
                await _refreshTokenRepository.RevokeAllForUserAsync(storedToken.UserId, DateTime.UtcNow);
                Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });
                return Unauthorized(new { message = "Refresh token reuse detected. All sessions revoked." });
            }

            if (storedToken.IsExpired)
            {
                return Unauthorized(new { message = "Invalid or expired refresh token" });
            }

            var user = await _userService.GetUserAsync(storedToken.UserId);

            // Revoke old token
            storedToken.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(storedToken);

            // Issue new tokens
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

            // Set new refresh token cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = newRefreshTokenEntity.ExpiresAt,
                Path = "/"
            };
            Response.Cookies.Append("refresh_token", newRefreshToken, cookieOptions);

            return Ok(new
            {
                accessToken = newAccessToken,
                refreshToken = newRefreshToken,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.FullName,
                    role = user.Role
                }
            });
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }
    }
}

/// <summary>
/// Login request model
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// User email
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// User password
    /// </summary>
    public string? Password { get; set; }
}

/// <summary>
/// Refresh token request model
/// </summary>
public class RefreshRequest
{
    /// <summary>
    /// Refresh token
    /// </summary>
    public string? RefreshToken { get; set; }
}

/// <summary>
/// Registration request model
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// User email
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// User password
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// User name
    /// </summary>
    public string? Name { get; set; }
}

public class SocialLoginRequest
{
    public string? ProviderUserId { get; set; }
    public string? Email { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// Refresh token request model
/// </summary>
public class RefreshTokenRequest
{
    /// <summary>
    /// Refresh token
    /// </summary>
    public string? RefreshToken { get; set; }
}

public class VerifyEmailRequest
{
    public string? Token { get; set; }
}

public class ResendVerificationRequest
{
    public string? Email { get; set; }
}

public class ForgotPasswordRequest
{
    public string? Email { get; set; }
}

public class ResetPasswordRequest
{
    public string? Token { get; set; }
    public string? NewPassword { get; set; }
}
