using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin/product-images")]
public class AdminProductImagesController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AdminProductImagesController> _logger;

    public AdminProductImagesController(IWebHostEnvironment environment, ILogger<AdminProductImagesController> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    [HttpGet("{productId:guid}")]
    public IActionResult GetProductImages(Guid productId)
    {
        return Ok(GetStoredProductImages(productId));
    }

    [HttpPost("{productId:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProductImage(Guid productId, [FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Image file is required." });
        }

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only image files are supported." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".jpg";
        }

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var productFolder = EnsureProductImageFolder(productId);
        var absolutePath = Path.Combine(productFolder, fileName);

        await using (var stream = System.IO.File.Create(absolutePath))
        {
            await file.CopyToAsync(stream);
        }

        var publicUrl = BuildPublicImageUrl(productId, fileName);
        _logger.LogInformation("Saved product image for {ProductId}: {Url}", productId, publicUrl);

        return Ok(new { success = true, imageUrl = publicUrl });
    }

    private string EnsureProductImageFolder(Guid productId)
    {
        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var folder = Path.Combine(webRoot, "uploads", "products", productId.ToString());
        Directory.CreateDirectory(folder);
        return folder;
    }

    private List<string> GetStoredProductImages(Guid productId)
    {
        var folder = EnsureProductImageFolder(productId);
        if (!Directory.Exists(folder))
        {
            return new List<string>();
        }

        return Directory
            .GetFiles(folder)
            .Select(Path.GetFileName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .Select(name => BuildPublicImageUrl(productId, name!))
            .ToList();
    }

    private static string BuildPublicImageUrl(Guid productId, string fileName)
        => $"/uploads/products/{productId}/{fileName}";
}

