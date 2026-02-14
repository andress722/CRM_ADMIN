using System.Security.Cryptography;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class TwoFactorService
{
    private readonly ITwoFactorProfileRepository _profiles;
    private readonly ITwoFactorSessionRepository _sessions;
    private readonly ITwoFactorChallengeRepository _challenges;

    public TwoFactorService(
        ITwoFactorProfileRepository profiles,
        ITwoFactorSessionRepository sessions,
        ITwoFactorChallengeRepository challenges)
    {
        _profiles = profiles;
        _sessions = sessions;
        _challenges = challenges;
    }

    public async Task<(Guid sessionId, string secret, string otpauthUrl, List<string> recoveryCodes)> SetupAsync(Guid userId, string email)
    {
        var secret = GenerateSecret();
        var recoveryCodes = GenerateRecoveryCodes();
        var now = DateTime.UtcNow;

        var profile = new TwoFactorProfile
        {
            UserId = userId,
            Secret = secret,
            Enabled = false,
            RecoveryCodes = string.Join(',', recoveryCodes),
            CreatedAt = now,
            UpdatedAt = now
        };

        await _profiles.UpsertAsync(profile);

        var session = new TwoFactorSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Secret = secret,
            ExpiresAt = now.AddMinutes(15),
            CreatedAt = now
        };

        await _sessions.AddAsync(session);

        var otpauthUrl = $"otpauth://totp/Ecommerce:{email}?secret={secret}&issuer=Ecommerce";
        return (session.Id, secret, otpauthUrl, recoveryCodes);
    }

    public async Task<bool> VerifySessionAsync(Guid sessionId, string code)
    {
        await _sessions.DeleteExpiredAsync(DateTime.UtcNow);
        var session = await _sessions.GetByIdAsync(sessionId);
        if (session == null)
        {
            return false;
        }

        if (DateTime.UtcNow > session.ExpiresAt)
        {
            return false;
        }

        return VerifyCode(session.Secret, code);
    }

    public async Task<bool> ConfirmAsync(Guid sessionId)
    {
        var session = await _sessions.GetByIdAsync(sessionId);
        if (session == null)
        {
            return false;
        }

        var profile = await _profiles.GetByUserIdAsync(session.UserId);
        if (profile == null)
        {
            return false;
        }

        profile.Enabled = true;
        profile.UpdatedAt = DateTime.UtcNow;
        await _profiles.UpdateAsync(profile);
        await _sessions.DeleteAsync(sessionId);
        return true;
    }

    public async Task<Guid?> CreateChallengeAsync(Guid userId)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile == null || !profile.Enabled)
        {
            return null;
        }

        var challenge = new TwoFactorChallenge
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            CreatedAt = DateTime.UtcNow
        };

        await _challenges.AddAsync(challenge);
        return challenge.Id;
    }

    public async Task<bool> VerifyChallengeAsync(Guid userId, Guid challengeId, string code)
    {
        await _challenges.DeleteExpiredAsync(DateTime.UtcNow);
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile == null || !profile.Enabled)
        {
            return false;
        }

        var challenge = await _challenges.GetByIdAsync(challengeId);
        if (challenge == null || challenge.UserId != userId)
        {
            return false;
        }

        if (challenge.ExpiresAt < DateTime.UtcNow)
        {
            return false;
        }

        var recoveryCodes = ParseRecoveryCodes(profile.RecoveryCodes);
        var verified = VerifyCode(profile.Secret, code);
        if (!verified && recoveryCodes.Contains(code))
        {
            recoveryCodes.Remove(code);
            profile.RecoveryCodes = string.Join(',', recoveryCodes);
            profile.UpdatedAt = DateTime.UtcNow;
            await _profiles.UpdateAsync(profile);
            verified = true;
        }

        if (!verified)
        {
            return false;
        }

        challenge.VerifiedAt = DateTime.UtcNow;
        await _challenges.UpdateAsync(challenge);
        await _challenges.DeleteAsync(challengeId);
        return true;
    }

    public async Task DisableAsync(Guid userId)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile == null)
        {
            return;
        }

        profile.Enabled = false;
        profile.UpdatedAt = DateTime.UtcNow;
        await _profiles.UpdateAsync(profile);
    }

    public async Task<List<string>?> RegenerateRecoveryCodesAsync(Guid userId)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile == null || !profile.Enabled)
        {
            return null;
        }

        var codes = GenerateRecoveryCodes();
        profile.RecoveryCodes = string.Join(',', codes);
        profile.UpdatedAt = DateTime.UtcNow;
        await _profiles.UpdateAsync(profile);
        return codes;
    }

    private static string GenerateSecret()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(20)).Replace("=", "");

    private static List<string> GenerateRecoveryCodes()
        => Enumerable.Range(0, 10)
            .Select(_ => Convert.ToHexString(RandomNumberGenerator.GetBytes(4)))
            .ToList();

    private static List<string> ParseRecoveryCodes(string? raw)
        => string.IsNullOrWhiteSpace(raw)
            ? new List<string>()
            : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static bool VerifyCode(string secret, string code)
        => !string.IsNullOrWhiteSpace(code) && code.Length >= 6;
}
