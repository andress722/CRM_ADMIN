using Ecommerce.Application.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ecommerce.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/[controller]")]
public class BannersController : ControllerBase
{
    private readonly IBannerRepository _bannerRepository;

    public BannersController(IBannerRepository bannerRepository)
    {
        _bannerRepository = bannerRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetActive()
    {
        var now = DateTime.UtcNow;

        var banners = (await _bannerRepository.GetAllAsync())
            .Where(x => x.Active)
            .Where(x =>
            {
                var startOk = DateTime.TryParse(x.StartDate, out var start) ? start <= now : true;
                var endOk = DateTime.TryParse(x.EndDate, out var end) ? end >= now : true;
                return startOk && endOk;
            })
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                image = x.Image,
                link = x.Link,
                startDate = x.StartDate,
                endDate = x.EndDate,
            })
            .ToList();

        return Ok(banners);
    }
}
