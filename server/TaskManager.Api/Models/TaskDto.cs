namespace TaskManager.Api.Models;

public class TaskDto
{
    public string Id { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public long CreatedAt { get; set; }

    public string ProjectId { get; set; } = string.Empty;
}
