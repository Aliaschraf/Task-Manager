using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TaskManager.Api.Models;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/state")]
[Authorize]
public class StateController : ControllerBase
{
    private readonly AppStateService _stateService;
    private readonly CurrentUserService _currentUser;

    public StateController(AppStateService stateService, CurrentUserService currentUser)
    {
        _stateService = stateService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<AppStateDto>> GetState(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var state = await _stateService.GetStateAsync(userId, cancellationToken);
        return Ok(state);
    }

    [HttpPut]
    public async Task<IActionResult> SaveState([FromBody] AppStateDto state, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _stateService.SaveStateAsync(userId, state, cancellationToken);
        return NoContent();
    }
}
