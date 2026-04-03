using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/undo")]
[Authorize]
public class UndoController : ControllerBase
{
    private readonly AppStateService _stateService;
    private readonly CurrentUserService _currentUser;

    public UndoController(AppStateService stateService, CurrentUserService currentUser)
    {
        _stateService = stateService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetUndoState(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var state = await _stateService.GetStateAsync(userId, cancellationToken);
        return Ok(new
        {
            deletedTasks = state.DeletedTasks,
            deletedProjects = state.DeletedProjects,
        });
    }

    [HttpPut]
    public async Task<IActionResult> SaveUndoState(
        [FromBody] UndoStateDto undoState,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _stateService.SaveUndoStateAsync(
            userId,
            undoState.DeletedTasks,
            undoState.DeletedProjects,
            cancellationToken);
        return NoContent();
    }

    public class UndoStateDto
    {
        public List<DeletedTaskDto> DeletedTasks { get; set; } = [];

        public List<DeletedProjectDto> DeletedProjects { get; set; } = [];
    }
}
