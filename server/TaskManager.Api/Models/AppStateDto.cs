namespace TaskManager.Api.Models;

public class AppStateDto
{
    public List<TaskDto> Tasks { get; set; } = [];

    public List<ProjectDto> Projects { get; set; } = [];

    public Dictionary<string, ProjectSettingsDto> ProjectSettings { get; set; } = new();

    public List<DeletedTaskDto> DeletedTasks { get; set; } = [];

    public List<DeletedProjectDto> DeletedProjects { get; set; } = [];

    public string? ActiveProjectId { get; set; }

    public List<string> ProjectStatusFilters { get; set; } = [];

    public bool IsFocusMode { get; set; }

    public ExportFieldsDto? ExportFields { get; set; }
}
