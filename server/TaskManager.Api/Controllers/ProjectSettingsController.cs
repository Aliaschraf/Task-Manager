using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/project-settings")]
public class ProjectSettingsController : ControllerBase
{
    private readonly AppStateService _stateService;

    public ProjectSettingsController(AppStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet("{projectId}")]
    public async Task<ActionResult<ProjectSettingsDto>> GetSettings(
        string projectId,
        CancellationToken cancellationToken)
    {
        var settings = await _stateService.GetProjectSettingsAsync(projectId, cancellationToken);
        if (settings == null)
        {
            return NotFound();
        }

        return Ok(settings);
    }

    [HttpPut("{projectId}")]
    public async Task<IActionResult> SaveSettings(
        string projectId,
        [FromBody] ProjectSettingsDto settings,
        CancellationToken cancellationToken)
    {
        await _stateService.SaveProjectSettingsAsync(projectId, settings, cancellationToken);
        return NoContent();
    }
}
