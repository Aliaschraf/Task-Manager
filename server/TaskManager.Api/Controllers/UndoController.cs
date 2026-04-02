using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/undo")]
public class UndoController : ControllerBase
{
    private readonly AppStateService _stateService;

    public UndoController(AppStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetUndoState(CancellationToken cancellationToken)
    {
        var state = await _stateService.GetStateAsync(cancellationToken);
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
        await _stateService.SaveUndoStateAsync(
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
