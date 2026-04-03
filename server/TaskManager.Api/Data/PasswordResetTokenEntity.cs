using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Data;

public class PasswordResetTokenEntity
{
    [Key]
    public string Id { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UsedAt { get; set; }
}
