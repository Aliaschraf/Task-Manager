namespace TaskManager.Api.Models;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public class SessionResponse
{
    public string Email { get; set; } = string.Empty;
}

public class PasswordResetRequest
{
    public string Email { get; set; } = string.Empty;
}

public class PasswordResetResponse
{
    public bool Accepted { get; set; }

    public string? DevToken { get; set; }
}

public class PasswordResetSubmitRequest
{
    public string Email { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public string NewPassword { get; set; } = string.Empty;
}
