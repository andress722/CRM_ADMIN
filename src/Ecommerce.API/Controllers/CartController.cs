using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Entities;

namespace Ecommerce.API.Controllers;

/// <summary>
/// Controlador para gerenciar carrinho de compras
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public class CartController : ControllerBase
{
    private readonly CartService _service;
    private readonly AnalyticsService _analyticsService;

    public CartController(CartService service, AnalyticsService analyticsService)
    {
        _service = service;
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Obtém carrinho do usuário
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid user" });
        }

        var cartItems = await _service.GetUserCartAsync(userId);
        return Ok(cartItems);
    }

    /// <summary>
    /// Adiciona item ao carrinho
    /// </summary>
    /// <param name="request">Dados do item</param>
    [HttpPost("items")]
    public async Task<IActionResult> AddToCart(AddToCartRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            var cartItem = await _service.AddToCartAsync(userId, request.ProductId, request.Quantity);

            await _analyticsService.TrackAsync(new AnalyticsEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = "AddToCart",
                Category = "Cart",
                Action = "AddItem",
                Label = request.ProductId.ToString(),
                Value = request.Quantity,
                Url = "/cart",
                CreatedAt = DateTime.UtcNow
            });

            return CreatedAtAction(nameof(GetCart), null, cartItem);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza quantidade de um item no carrinho
    /// </summary>
    /// <param name="id">ID do item do carrinho</param>
    /// <param name="request">Nova quantidade</param>
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateCartItem(Guid id, UpdateCartItemRequest request)
    {
        try
        {
            var cartItem = await _service.UpdateCartItemAsync(id, request.Quantity);
            return Ok(cartItem);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove item do carrinho
    /// </summary>
    /// <param name="id">ID do item do carrinho</param>
    [HttpDelete("items/{id}")]
    public async Task<IActionResult> RemoveFromCart(Guid id)
    {
        await _service.RemoveFromCartAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Limpa o carrinho do usuário
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Invalid user" });
        }

        await _service.ClearCartAsync(userId);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(sub, out var userId) ? userId : Guid.Empty;
    }
}

/// <summary>Dados para adicionar item ao carrinho</summary>
public record AddToCartRequest(
    Guid ProductId,
    int Quantity
);

/// <summary>Dados para atualizar item do carrinho</summary>
public record UpdateCartItemRequest(
    int Quantity
);
