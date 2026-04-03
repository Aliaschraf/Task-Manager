using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Data;

public class UserEntity
{
    [Key]
    public string Id { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
