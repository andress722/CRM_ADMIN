using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador para gerenciar usuários
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserService _service;
    private readonly OrderService _orderService;
    private readonly WishlistService _wishlistService;
    private readonly UserAddressService _addressService;

    public UsersController(UserService service, OrderService orderService, WishlistService wishlistService, UserAddressService addressService)
    {
        _service = service;
        _orderService = orderService;
        _wishlistService = wishlistService;
        _addressService = addressService;
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "OwnerOrAdmin")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        try
        {
            var user = await _service.GetUserAsync(id);
            return Ok(user);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("email/{email}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUserByEmail(string email)
    {
        var user = await _service.GetUserByEmailAsync(email);
        if (user == null)
            return NotFound(new { message = $"User with email {email} not found" });
        return Ok(user);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        try
        {
            var user = await _service.CreateUserAsync(request.Email, request.FullName, request.PasswordHash);
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // --- Current user shortcuts ---
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var id = GetCurrentUserId();
        if (id == Guid.Empty) return Unauthorized();
        try
        {
            var user = await _service.GetUserAsync(id);
            return Ok(user);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("me/orders")]
    [Authorize]
    public async Task<IActionResult> GetMyOrders()
    {
        var id = GetCurrentUserId();
        if (id == Guid.Empty) return Unauthorized();
        var orders = await _orderService.GetUserOrdersAsync(id);
        return Ok(orders);
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request)
    {
        var id = GetCurrentUserId();
        if (id == Guid.Empty) return Unauthorized();
        try
        {
            var user = await _service.GetUserAsync(id);
            user.FullName = request.Name ?? user.FullName;
            user.Email = request.Email ?? user.Email;
            await _service.UpdateUserAsync(user);
            return Ok(user);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("me/addresses")]
    [Authorize]
    public async Task<IActionResult> GetMyAddresses()
    {
        var id = GetCurrentUserId();
        if (id == Guid.Empty) return Unauthorized();

        var addresses = await _addressService.GetUserAddressesAsync(id);
        return Ok(addresses);
    }

    [HttpGet("me/addresses/{id}")]
    [Authorize]
    public async Task<IActionResult> GetMyAddress(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var address = await _addressService.GetAsync(id);
        if (address == null || address.UserId != userId)
        {
            return NotFound(new { message = "Address not found" });
        }

        return Ok(address);
    }

    [HttpPost("me/addresses")]
    [Authorize]
    public async Task<IActionResult> CreateMyAddress(CreateUserAddressRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var validation = ValidateAddressRequest(request);
        if (validation != null)
        {
            return BadRequest(new { message = validation });
        }

        var address = await _addressService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetMyAddress), new { id = address.Id }, address);
    }

    [HttpPut("me/addresses/{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateMyAddress(Guid id, UpdateUserAddressRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var address = await _addressService.GetAsync(id);
        if (address == null || address.UserId != userId)
        {
            return NotFound(new { message = "Address not found" });
        }

        var updated = await _addressService.UpdateAsync(address, request);
        return Ok(updated);
    }

    [HttpDelete("me/addresses/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteMyAddress(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var address = await _addressService.GetAsync(id);
        if (address == null || address.UserId != userId)
        {
            return NotFound(new { message = "Address not found" });
        }

        await _addressService.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("me/addresses/{id}/default")]
    [Authorize]
    public async Task<IActionResult> SetDefaultAddress(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var address = await _addressService.GetAsync(id);
        if (address == null || address.UserId != userId)
        {
            return NotFound(new { message = "Address not found" });
        }

        await _addressService.SetDefaultAsync(userId, id);
        return Ok(new { message = "Default address updated" });
    }

    [HttpGet("me/stats")]
    [Authorize]
    public async Task<IActionResult> GetMyStats()
    {
        var id = GetCurrentUserId();
        if (id == Guid.Empty) return Unauthorized();

        var orders = (await _orderService.GetUserOrdersAsync(id)).ToList();
        var ordersCount = orders.Count;
        var totalSpent = orders.Sum(o => o.TotalAmount);

        var wishlist = await _wishlistService.GetOrCreateDefaultAsync(id);
        var wishlistItems = await _wishlistService.GetItemsAsync(wishlist.Id);
        var favorites = wishlistItems.Count();

        // Reviews per-user not available from service currently
        var reviews = 0;

        return Ok(new { orders = ordersCount, spent = totalSpent, favorites, reviews });
    }

    private static string? ValidateAddressRequest(CreateUserAddressRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Label)) return "Label is required";
        if (string.IsNullOrWhiteSpace(request.RecipientName)) return "RecipientName is required";
        if (string.IsNullOrWhiteSpace(request.Phone)) return "Phone is required";
        if (string.IsNullOrWhiteSpace(request.Line1)) return "Line1 is required";
        if (string.IsNullOrWhiteSpace(request.City)) return "City is required";
        if (string.IsNullOrWhiteSpace(request.State)) return "State is required";
        if (string.IsNullOrWhiteSpace(request.PostalCode)) return "PostalCode is required";
        if (string.IsNullOrWhiteSpace(request.Country)) return "Country is required";

        return null;
    }
}

public record UpdateProfileRequest(string? Name, string? Email);

/// <summary>
/// Dados para criar um novo usuário
/// </summary>
public record CreateUserRequest(
    /// <summary>Email do usuário</summary>
    string Email,
    /// <summary>Nome completo</summary>
    string FullName,
    /// <summary>Hash da senha</summary>
    string PasswordHash
);
