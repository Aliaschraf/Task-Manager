using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppStateService _stateService;
    private readonly CurrentUserService _currentUser;

    public TasksController(AppStateService stateService, CurrentUserService currentUser)
    {
        _stateService = stateService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetTasks(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var tasks = await _stateService.GetTasksAsync(userId, cancellationToken);
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(string id, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var task = await _stateService.GetTaskAsync(userId, id, cancellationToken);
        if (task == null)
        {
            return NotFound();
        }

        return Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] TaskDto task, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var created = await _stateService.CreateTaskAsync(userId, task, cancellationToken);
        return CreatedAtAction(nameof(GetTask), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] TaskDto task, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var updated = await _stateService.UpdateTaskAsync(userId, id, task, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(string id, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var deleted = await _stateService.DeleteTaskAsync(userId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
