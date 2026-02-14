using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class UserService
{
    private readonly IUserRepository _repository;

    public UserService(IUserRepository repository)
        => _repository = repository;

    public async Task<User> GetUserAsync(Guid id)
    {
        var user = await _repository.GetByIdAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");
        return user;
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _repository.GetByEmailAsync(email);
    }

    public async Task<User> CreateUserAsync(string email, string fullName, string passwordHash)
    {
        var existingUser = await _repository.GetByEmailAsync(email);
        if (existingUser != null)
            throw new InvalidOperationException($"User with email {email} already exists");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            PasswordHash = passwordHash,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(user);
        return user;
    }

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        return await _repository.GetAllAsync();
    }

    public async Task<User> UpdateUserAsync(User user)
    {
        await _repository.UpdateAsync(user);
        return user;
    }
}
