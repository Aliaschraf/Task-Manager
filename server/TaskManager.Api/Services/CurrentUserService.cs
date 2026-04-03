using System.Security.Claims;

namespace TaskManager.Api.Services;

public class CurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetRequiredUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userId = user?.FindFirstValue("uid");
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new InvalidOperationException("User id is missing from the current session.");
        }

        return userId;
    }

    public string? GetEmail()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        return user?.FindFirstValue(ClaimTypes.Email);
    }
}
