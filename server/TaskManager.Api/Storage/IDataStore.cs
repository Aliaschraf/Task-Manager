using TaskManager.Api.Models;

namespace TaskManager.Api.Storage;

public interface IDataStore
{
    Task<AppStateDto> GetStateAsync(CancellationToken cancellationToken = default);

    Task SaveStateAsync(AppStateDto state, CancellationToken cancellationToken = default);
}
