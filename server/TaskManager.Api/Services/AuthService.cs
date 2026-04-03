using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;

namespace TaskManager.Api.Services;

public class AuthService
{
    private const int ResetTokenBytes = 32;
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromHours(2);

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<UserEntity> _passwordHasher;

    public AuthService(AppDbContext dbContext, IPasswordHasher<UserEntity> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<UserEntity?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var normalized = NormalizeEmail(email);
        return await _dbContext.Users.FirstOrDefaultAsync(user => user.Email == normalized, cancellationToken);
    }

    public async Task<UserEntity> CreateUserAsync(string email, string password, CancellationToken cancellationToken)
    {
        var normalized = NormalizeEmail(email);
        var exists = await _dbContext.Users.AnyAsync(user => user.Email == normalized, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Email already registered.");
        }

        var user = new UserEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            Email = normalized,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public bool VerifyPassword(UserEntity user, string password)
    {
        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result == PasswordVerificationResult.Success ||
               result == PasswordVerificationResult.SuccessRehashNeeded;
    }

    public async Task<(string token, PasswordResetTokenEntity entity)> CreatePasswordResetAsync(
        UserEntity user,
        CancellationToken cancellationToken)
    {
        var token = GenerateToken();
        var tokenHash = HashToken(token);
        var entity = new PasswordResetTokenEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(ResetTokenLifetime),
        };

        _dbContext.PasswordResetTokens.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return (token, entity);
    }

    public async Task<bool> ResetPasswordAsync(
        UserEntity user,
        string token,
        string newPassword,
        CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(token);
        var reset = await _dbContext.PasswordResetTokens
            .Where(item => item.UserId == user.Id && item.TokenHash == tokenHash)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (reset == null || reset.UsedAt.HasValue || reset.ExpiresAt <= DateTime.UtcNow)
        {
            return false;
        }

        reset.UsedAt = DateTime.UtcNow;
        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string NormalizeEmail(string email)
        => email.Trim().ToLowerInvariant();

    private static string GenerateToken()
    {
        Span<byte> buffer = stackalloc byte[ResetTokenBytes];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToBase64String(buffer)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
