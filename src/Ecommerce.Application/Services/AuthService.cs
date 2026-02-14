using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Ecommerce.Application.Services;

public class AuthService
{
    private readonly IUserRepository _users;
    private readonly IEmailVerificationTokenRepository _emailTokens;
    private readonly IPasswordResetTokenRepository _resetTokens;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AuthService(
        IUserRepository users,
        IEmailVerificationTokenRepository emailTokens,
        IPasswordResetTokenRepository resetTokens,
        IPasswordHasher<User> passwordHasher)
    {
        _users = users;
        _emailTokens = emailTokens;
        _resetTokens = resetTokens;
        _passwordHasher = passwordHasher;
    }

    public bool IsLockedOut(User user)
    {
        return user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow;
    }

    public async Task RecordFailedLoginAsync(User user, int maxAttempts, int lockoutMinutes)
    {
        user.FailedLoginAttempts += 1;
        if (user.FailedLoginAttempts >= maxAttempts)
        {
            user.LockoutEnd = DateTime.UtcNow.AddMinutes(lockoutMinutes);
            user.FailedLoginAttempts = 0;
        }

        await _users.UpdateAsync(user);
    }

    public async Task ResetLockoutAsync(User user)
    {
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        await _users.UpdateAsync(user);
    }

    public async Task<EmailVerificationToken> CreateEmailVerificationTokenAsync(User user, TimeSpan ttl)
    {
        var token = new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(ttl)
        };

        await _emailTokens.AddAsync(token);
        return token;
    }

    public async Task<bool> VerifyEmailAsync(string tokenValue)
    {
        var token = await _emailTokens.GetByTokenAsync(tokenValue);
        if (token == null || token.IsUsed || token.IsExpired)
        {
            return false;
        }

        var user = await _users.GetByIdAsync(token.UserId);
        if (user == null)
        {
            return false;
        }

        user.IsEmailVerified = true;
        await _users.UpdateAsync(user);

        token.UsedAt = DateTime.UtcNow;
        await _emailTokens.UpdateAsync(token);
        return true;
    }

    public async Task<PasswordResetToken> CreatePasswordResetTokenAsync(User user, TimeSpan ttl)
    {
        var token = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(ttl)
        };

        await _resetTokens.AddAsync(token);
        return token;
    }

    public async Task<bool> ResetPasswordAsync(string tokenValue, string newPassword)
    {
        var token = await _resetTokens.GetByTokenAsync(tokenValue);
        if (token == null || token.IsUsed || token.IsExpired)
        {
            return false;
        }

        var user = await _users.GetByIdAsync(token.UserId);
        if (user == null)
        {
            return false;
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        await _users.UpdateAsync(user);

        token.UsedAt = DateTime.UtcNow;
        await _resetTokens.UpdateAsync(token);
        return true;
    }
}
