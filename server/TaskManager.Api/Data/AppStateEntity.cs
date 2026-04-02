using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Data;

public class AppStateEntity
{
    [Key]
    public int Id { get; set; }

    public string Json { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}
