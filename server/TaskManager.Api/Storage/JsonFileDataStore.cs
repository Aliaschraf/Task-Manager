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

    public async Task<AppStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default)
    {
        var resolvedPath = ResolveUserPath(userId);
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(resolvedPath))
            {
                return new AppStateDto();
            }

            await using var stream = File.OpenRead(resolvedPath);
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

    public async Task SaveStateAsync(string userId, AppStateDto state, CancellationToken cancellationToken = default)
    {
        var resolvedPath = ResolveUserPath(userId);
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var directory = Path.GetDirectoryName(resolvedPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await using var stream = File.Create(resolvedPath);
            await JsonSerializer.SerializeAsync(stream, state, _jsonOptions, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    private string ResolveUserPath(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return _filePath;
        }

        var safeUserId = userId.Replace("/", "_").Replace("\\", "_");
        var directory = Path.GetDirectoryName(_filePath) ?? string.Empty;
        var filename = Path.GetFileNameWithoutExtension(_filePath);
        var extension = Path.GetExtension(_filePath);
        var userFile = $"{filename}-{safeUserId}{extension}";
        return Path.Combine(directory, userFile);
    }
}
