using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Ecommerce.Application.Services;

public class SocialAuthService
{
    private readonly IUserRepository _users;
    private readonly IExternalIdentityRepository _externalIdentities;
    private readonly IPasswordHasher<User> _passwordHasher;

    public SocialAuthService(
        IUserRepository users,
        IExternalIdentityRepository externalIdentities,
        IPasswordHasher<User> passwordHasher)
    {
        _users = users;
        _externalIdentities = externalIdentities;
        _passwordHasher = passwordHasher;
    }

    public async Task<User> AuthenticateAsync(string provider, string providerUserId, string email, string? name)
    {
        if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(providerUserId) || string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Provider, provider user id and email are required");

        var normalizedProvider = provider.Trim().ToLowerInvariant();
        if (normalizedProvider != "google" && normalizedProvider != "facebook")
            throw new ArgumentException("Provider not supported");

        var existingIdentity = await _externalIdentities.GetByProviderAsync(normalizedProvider, providerUserId.Trim());
        if (existingIdentity != null)
        {
            var existingUser = await _users.GetByIdAsync(existingIdentity.UserId);
            if (existingUser != null)
                return existingUser;
        }

        var user = await _users.GetByEmailAsync(email.Trim());
        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email.Trim(),
                FullName = string.IsNullOrWhiteSpace(name) ? "User" : name.Trim(),
                PasswordHash = _passwordHasher.HashPassword(new User(), Guid.NewGuid().ToString("N")),
                Role = "User",
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            await _users.AddAsync(user);
        }

        var identity = new ExternalIdentity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Provider = normalizedProvider,
            ProviderUserId = providerUserId.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _externalIdentities.AddAsync(identity);
        return user;
    }
}
