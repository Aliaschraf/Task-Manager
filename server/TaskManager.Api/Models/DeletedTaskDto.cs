namespace TaskManager.Api.Models;

public class DeletedTaskDto
{
    public string Id { get; set; } = string.Empty;

    public TaskDto Task { get; set; } = new();

    public int Index { get; set; }

    public long TimeoutId { get; set; }
}
