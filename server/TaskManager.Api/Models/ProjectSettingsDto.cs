namespace TaskManager.Api.Models;

public class ProjectSettingsDto
{
    public List<TaskStatusOptionDto> StatusOptions { get; set; } = [];

    public List<string> StatusFilters { get; set; } = [];

    public string SortId { get; set; } = "flow";

    public string SortDirection { get; set; } = "desc";
}
