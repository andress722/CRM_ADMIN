using Microsoft.AspNetCore.Authorization;

namespace Ecommerce.API.Authorization;

public class OwnerOrAdminRequirement : IAuthorizationRequirement
{
}
