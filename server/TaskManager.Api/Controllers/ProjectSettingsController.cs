using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/project-settings")]
[Authorize]
public class ProjectSettingsController : ControllerBase
{
    private readonly AppStateService _stateService;
    private readonly CurrentUserService _currentUser;

    public ProjectSettingsController(AppStateService stateService, CurrentUserService currentUser)
    {
        _stateService = stateService;
        _currentUser = currentUser;
    }

    [HttpGet("{projectId}")]
    public async Task<ActionResult<ProjectSettingsDto>> GetSettings(
        string projectId,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var settings = await _stateService.GetProjectSettingsAsync(userId, projectId, cancellationToken);
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
        var userId = _currentUser.GetRequiredUserId();
        await _stateService.SaveProjectSettingsAsync(userId, projectId, settings, cancellationToken);
        return NoContent();
    }
}
