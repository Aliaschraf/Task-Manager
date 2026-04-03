using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IPasswordResetSender _resetSender;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        AuthService authService,
        IPasswordResetSender resetSender,
        IWebHostEnvironment environment)
    {
        _authService = authService;
        _resetSender = resetSender;
        _environment = environment;
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<SessionResponse> GetSession()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        return Ok(new SessionResponse { Email = email });
    }

    [HttpPost("register")]
    public async Task<ActionResult<SessionResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        var user = await _authService.CreateUserAsync(request.Email, request.Password, cancellationToken);
        await SignInAsync(user);
        return Ok(new SessionResponse { Email = user.Email });
    }

    [HttpPost("login")]
    public async Task<ActionResult<SessionResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        var user = await _authService.FindByEmailAsync(request.Email, cancellationToken);
        if (user == null || !_authService.VerifyPassword(user, request.Password))
        {
            return Unauthorized();
        }

        await SignInAsync(user);
        return Ok(new SessionResponse { Email = user.Email });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpPost("request-reset")]
    public async Task<ActionResult<PasswordResetResponse>> RequestPasswordReset(
        [FromBody] PasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email is required.");
        }

        var user = await _authService.FindByEmailAsync(request.Email, cancellationToken);
        if (user == null)
        {
            return Ok(new PasswordResetResponse { Accepted = true });
        }

        var (token, _) = await _authService.CreatePasswordResetAsync(user, cancellationToken);

        if (_environment.IsDevelopment())
        {
            return Ok(new PasswordResetResponse { Accepted = true, DevToken = token });
        }

        var baseUrl = ResolveFrontendBaseUrl();
        var resetLink = $"{baseUrl.TrimEnd('/')}/reset?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";
        await _resetSender.SendAsync(user.Email, resetLink, cancellationToken);
        return Ok(new PasswordResetResponse { Accepted = true });
    }

    [HttpPost("reset")]
    public async Task<IActionResult> ResetPassword(
        [FromBody] PasswordResetSubmitRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest("Email, token, and new password are required.");
        }

        var user = await _authService.FindByEmailAsync(request.Email, cancellationToken);
        if (user == null)
        {
            return BadRequest("Invalid reset token.");
        }

        var success = await _authService.ResetPasswordAsync(
            user,
            request.Token,
            request.NewPassword,
            cancellationToken);

        return success ? NoContent() : BadRequest("Invalid reset token.");
    }

    private async Task SignInAsync(Data.UserEntity user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new("uid", user.Id),
            new(ClaimTypes.Email, user.Email),
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
    }

    private string ResolveFrontendBaseUrl()
    {
        if (Request.Headers.TryGetValue("Origin", out var origin) && !string.IsNullOrWhiteSpace(origin))
        {
            return origin.ToString();
        }

        var host = Request.Host.HasValue ? Request.Host.Value : "localhost:5173";
        var scheme = Request.IsHttps ? "https" : "http";
        return $"{scheme}://{host}";
    }
}
