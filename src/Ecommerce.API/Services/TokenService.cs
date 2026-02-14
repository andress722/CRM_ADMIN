using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Ecommerce.API.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime GetRefreshTokenExpiryUtc();
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
        => _configuration = configuration;

    public string GenerateAccessToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "ecommerce-api";
        var audience = _configuration["Jwt:Audience"] ?? "ecommerce-admin";
        var secret = _configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey is not configured");
        var expiresMinutes = _configuration.GetValue("Jwt:AccessTokenMinutes", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    public DateTime GetRefreshTokenExpiryUtc()
    {
        var days = _configuration.GetValue("Jwt:RefreshTokenDays", 7);
        return DateTime.UtcNow.AddDays(days);
    }
}
