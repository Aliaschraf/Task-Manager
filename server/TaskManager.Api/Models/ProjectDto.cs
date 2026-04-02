namespace TaskManager.Api.Models;

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool? IsDefault { get; set; }
}
