using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class UserAddressService
{
    private readonly IUserAddressRepository _repository;

    public UserAddressService(IUserAddressRepository repository)
        => _repository = repository;

    public async Task<IEnumerable<UserAddress>> GetUserAddressesAsync(Guid userId)
        => await _repository.GetByUserIdAsync(userId);

    public async Task<UserAddress?> GetAsync(Guid id)
        => await _repository.GetByIdAsync(id);

    public async Task<UserAddress> CreateAsync(Guid userId, CreateUserAddressRequest request)
    {
        var existing = (await _repository.GetByUserIdAsync(userId)).ToList();
        var isDefault = request.IsDefault || !existing.Any();

        if (isDefault)
        {
            await _repository.ClearDefaultAsync(userId);
        }

        var address = new UserAddress
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Label = request.Label,
            RecipientName = request.RecipientName,
            Phone = request.Phone,
            Line1 = request.Line1,
            Line2 = request.Line2,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            Country = request.Country,
            IsDefault = isDefault,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(address);
        return address;
    }

    public async Task<UserAddress> UpdateAsync(UserAddress address, UpdateUserAddressRequest request)
    {
        if (request.Label != null) address.Label = request.Label;
        if (request.RecipientName != null) address.RecipientName = request.RecipientName;
        if (request.Phone != null) address.Phone = request.Phone;
        if (request.Line1 != null) address.Line1 = request.Line1;
        if (request.Line2 != null) address.Line2 = request.Line2;
        if (request.City != null) address.City = request.City;
        if (request.State != null) address.State = request.State;
        if (request.PostalCode != null) address.PostalCode = request.PostalCode;
        if (request.Country != null) address.Country = request.Country;

        if (request.IsDefault.HasValue && request.IsDefault.Value && !address.IsDefault)
        {
            await _repository.ClearDefaultAsync(address.UserId);
            address.IsDefault = true;
        }

        address.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(address);
        return address;
    }

    public async Task DeleteAsync(Guid id)
        => await _repository.DeleteAsync(id);

    public async Task SetDefaultAsync(Guid userId, Guid addressId)
    {
        await _repository.ClearDefaultAsync(userId);
        var address = await _repository.GetByIdAsync(addressId);
        if (address != null)
        {
            address.IsDefault = true;
            address.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(address);
        }
    }
}

public record CreateUserAddressRequest(
    string Label,
    string RecipientName,
    string Phone,
    string Line1,
    string? Line2,
    string City,
    string State,
    string PostalCode,
    string Country,
    bool IsDefault
);

public record UpdateUserAddressRequest(
    string? Label,
    string? RecipientName,
    string? Phone,
    string? Line1,
    string? Line2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    bool? IsDefault
);
