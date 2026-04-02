using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly AppStateService _stateService;

    public ProjectsController(AppStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetProjects(CancellationToken cancellationToken)
    {
        var projects = await _stateService.GetProjectsAsync(cancellationToken);
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(string id, CancellationToken cancellationToken)
    {
        var project = await _stateService.GetProjectAsync(id, cancellationToken);
        if (project == null)
        {
            return NotFound();
        }

        return Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject(
        [FromBody] ProjectDto project,
        CancellationToken cancellationToken)
    {
        var created = await _stateService.CreateProjectAsync(project, cancellationToken);
        return CreatedAtAction(nameof(GetProject), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(
        string id,
        [FromBody] ProjectDto project,
        CancellationToken cancellationToken)
    {
        var updated = await _stateService.UpdateProjectAsync(id, project, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(string id, CancellationToken cancellationToken)
    {
        var deleted = await _stateService.DeleteProjectAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
