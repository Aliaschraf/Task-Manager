namespace TaskManager.Api.Models;

public class ExportFieldsDto
{
    public bool ProjectName { get; set; }

    public bool ProjectDescription { get; set; }

    public bool ProjectStatus { get; set; }

    public bool TaskStatus { get; set; }

    public bool TaskPriority { get; set; }

    public bool TaskCreated { get; set; }
}
