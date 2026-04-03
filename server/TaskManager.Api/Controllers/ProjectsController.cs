using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppStateService _stateService;
    private readonly CurrentUserService _currentUser;

    public ProjectsController(AppStateService stateService, CurrentUserService currentUser)
    {
        _stateService = stateService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetProjects(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var projects = await _stateService.GetProjectsAsync(userId, cancellationToken);
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(string id, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var project = await _stateService.GetProjectAsync(userId, id, cancellationToken);
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
        var userId = _currentUser.GetRequiredUserId();
        var created = await _stateService.CreateProjectAsync(userId, project, cancellationToken);
        return CreatedAtAction(nameof(GetProject), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(
        string id,
        [FromBody] ProjectDto project,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var updated = await _stateService.UpdateProjectAsync(userId, id, project, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(string id, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var deleted = await _stateService.DeleteProjectAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
