using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly AppStateService _stateService;

    public TasksController(AppStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetTasks(CancellationToken cancellationToken)
    {
        var tasks = await _stateService.GetTasksAsync(cancellationToken);
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(string id, CancellationToken cancellationToken)
    {
        var task = await _stateService.GetTaskAsync(id, cancellationToken);
        if (task == null)
        {
            return NotFound();
        }

        return Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] TaskDto task, CancellationToken cancellationToken)
    {
        var created = await _stateService.CreateTaskAsync(task, cancellationToken);
        return CreatedAtAction(nameof(GetTask), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] TaskDto task, CancellationToken cancellationToken)
    {
        var updated = await _stateService.UpdateTaskAsync(id, task, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(string id, CancellationToken cancellationToken)
    {
        var deleted = await _stateService.DeleteTaskAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
