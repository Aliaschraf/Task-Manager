using TaskManager.Api.Models;

namespace TaskManager.Api.Storage;

public interface IDataStore
{
    Task<AppStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default);

    Task SaveStateAsync(string userId, AppStateDto state, CancellationToken cancellationToken = default);
}
