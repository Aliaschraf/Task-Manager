using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Storage;

public class PostgresDataStore : IDataStore
{

    private readonly AppDbContext _dbContext;
    private readonly JsonSerializerOptions _jsonOptions;

    public PostgresDataStore(AppDbContext dbContext, JsonSerializerOptions jsonOptions)
    {
        _dbContext = dbContext;
        _jsonOptions = jsonOptions;
    }

    public async Task<AppStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.AppStates
            .AsNoTracking()
            .FirstOrDefaultAsync(state => state.UserId == userId, cancellationToken);

        if (entity == null || string.IsNullOrWhiteSpace(entity.Json))
        {
            return new AppStateDto();
        }

        var state = JsonSerializer.Deserialize<AppStateDto>(entity.Json, _jsonOptions);
        return state ?? new AppStateDto();
    }

    public async Task SaveStateAsync(string userId, AppStateDto state, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(state, _jsonOptions);

        var entity = await _dbContext.AppStates
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        if (entity == null)
        {
            entity = new AppStateEntity
            {
                UserId = userId,
                Json = payload,
                UpdatedAt = DateTime.UtcNow,
            };
            _dbContext.AppStates.Add(entity);
        }
        else
        {
            entity.Json = payload;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
