using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.API.Services;

public interface IIdempotencyService
{
    string ComputeRequestHash(object? body);
    Task<IdempotencyRecord?> GetAsync(string scope, string key, CancellationToken ct = default);
    Task SaveAsync(string scope, string key, string requestHash, int statusCode, object response, TimeSpan ttl, CancellationToken ct = default);
}

public class IdempotencyService : IIdempotencyService
{
    private readonly EcommerceDbContext _db;

    public IdempotencyService(EcommerceDbContext db)
    {
        _db = db;
    }

    public string ComputeRequestHash(object? body)
    {
        var json = JsonSerializer.Serialize(body ?? new { });
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(json));
        return Convert.ToHexString(bytes);
    }

    public async Task<IdempotencyRecord?> GetAsync(string scope, string key, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await _db.IdempotencyRecords
            .Where(x => x.Scope == scope && x.Key == key && x.ExpiresAt > now)
            .FirstOrDefaultAsync(ct);
    }

    public async Task SaveAsync(string scope, string key, string requestHash, int statusCode, object response, TimeSpan ttl, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var existing = await _db.IdempotencyRecords
            .Where(x => x.Scope == scope && x.Key == key)
            .FirstOrDefaultAsync(ct);

        var payload = JsonSerializer.Serialize(response);
        if (existing == null)
        {
            existing = new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                Scope = scope,
                Key = key,
                RequestHash = requestHash,
                ResponseStatusCode = statusCode,
                ResponseBody = payload,
                CreatedAt = now,
                ExpiresAt = now.Add(ttl)
            };
            await _db.IdempotencyRecords.AddAsync(existing, ct);
        }
        else
        {
            existing.RequestHash = requestHash;
            existing.ResponseStatusCode = statusCode;
            existing.ResponseBody = payload;
            existing.ExpiresAt = now.Add(ttl);
        }

        await _db.SaveChangesAsync(ct);
    }
}
