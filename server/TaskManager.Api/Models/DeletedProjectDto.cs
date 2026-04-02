namespace TaskManager.Api.Models;

public class DeletedProjectDto
{
    public string Id { get; set; } = string.Empty;

    public ProjectDto Project { get; set; } = new();

    public int Index { get; set; }

    public string FallbackProjectId { get; set; } = string.Empty;

    public List<TaskDto> Tasks { get; set; } = [];

    public ProjectSettingsDto? Settings { get; set; }

    public long TimeoutId { get; set; }

    public bool WasActive { get; set; }
}
