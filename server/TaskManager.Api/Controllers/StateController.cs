using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/state")]
public class StateController : ControllerBase
{
    private readonly AppStateService _stateService;

    public StateController(AppStateService stateService)
    {
        _stateService = stateService;
    }

    [HttpGet]
    public async Task<ActionResult<AppStateDto>> GetState(CancellationToken cancellationToken)
    {
        var state = await _stateService.GetStateAsync(cancellationToken);
        return Ok(state);
    }

    [HttpPut]
    public async Task<IActionResult> SaveState([FromBody] AppStateDto state, CancellationToken cancellationToken)
    {
        await _stateService.SaveStateAsync(state, cancellationToken);
        return NoContent();
    }
}
