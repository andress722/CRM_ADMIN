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

    public UsersController(UserService service, OrderService orderService, WishlistService wishlistService)
    {
        _service = service;
        _orderService = orderService;
        _wishlistService = wishlistService;
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
