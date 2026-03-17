using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class PushDeviceService
{
    private readonly IPushDeviceRepository _repository;

    public PushDeviceService(IPushDeviceRepository repository)
        => _repository = repository;

    public async Task<PushDevice> RegisterAsync(Guid userId, string token, string platform, string? deviceName)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(platform))
            throw new ArgumentException("Token and platform are required");

        if (!PushNotificationService.IsSupportedPlatform(platform))
            throw new ArgumentException("Platform must be one of: ios, android, expo, web");

        var normalizedToken = token.Trim();
        var normalizedPlatform = platform.Trim().ToLowerInvariant();

        var existing = await _repository.GetByUserAndTokenAsync(userId, normalizedToken);
        if (existing != null)
        {
            existing.Platform = normalizedPlatform;
            existing.DeviceName = string.IsNullOrWhiteSpace(deviceName) ? existing.DeviceName : deviceName.Trim();
            existing.LastSeenAt = DateTime.UtcNow;
            await _repository.UpdateAsync(existing);
            return existing;
        }

        var device = new PushDevice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = normalizedToken,
            Platform = normalizedPlatform,
            DeviceName = string.IsNullOrWhiteSpace(deviceName) ? null : deviceName.Trim(),
            CreatedAt = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow
        };

        await _repository.AddAsync(device);
        return device;
    }

    public async Task<IEnumerable<PushDevice>> GetByUserAsync(Guid userId)
        => await _repository.GetByUserAsync(userId);

    public async Task RemoveAsync(Guid userId, string token)
    {
        var existing = await _repository.GetByUserAndTokenAsync(userId, token.Trim());
        if (existing == null)
            return;

        await _repository.RemoveAsync(existing);
    }
}
