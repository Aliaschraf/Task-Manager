using System.Text.Json;
using Microsoft.Extensions.Options;
using TaskManager.Api.Models;
using TaskManager.Api.Options;

namespace TaskManager.Api.Storage;

public class JsonFileDataStore : IDataStore
{
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public JsonFileDataStore(
        IOptions<StorageOptions> options,
        IWebHostEnvironment environment,
        JsonSerializerOptions jsonOptions)
    {
        _jsonOptions = jsonOptions;
        var configuredPath = options.Value.JsonPath;
        _filePath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.Combine(environment.ContentRootPath, configuredPath);
    }

    public async Task<AppStateDto> GetStateAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(_filePath))
            {
                return new AppStateDto();
            }

            await using var stream = File.OpenRead(_filePath);
            var state = await JsonSerializer.DeserializeAsync<AppStateDto>(
                stream,
                _jsonOptions,
                cancellationToken);
            return state ?? new AppStateDto();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SaveStateAsync(AppStateDto state, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await using var stream = File.Create(_filePath);
            await JsonSerializer.SerializeAsync(stream, state, _jsonOptions, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }
}
