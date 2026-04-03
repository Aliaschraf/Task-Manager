using TaskManager.Api.Models;
using TaskManager.Api.Storage;

namespace TaskManager.Api.Services;

public class AppStateService
{
    private readonly IDataStore _dataStore;

    public AppStateService(IDataStore dataStore)
    {
        _dataStore = dataStore;
    }

    public Task<AppStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default)
        => _dataStore.GetStateAsync(userId, cancellationToken);

    public Task SaveStateAsync(string userId, AppStateDto state, CancellationToken cancellationToken = default)
        => _dataStore.SaveStateAsync(userId, state, cancellationToken);

    public async Task<List<TaskDto>> GetTasksAsync(string userId, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        return state.Tasks;
    }

    public async Task<TaskDto?> GetTaskAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        return state.Tasks.FirstOrDefault(task => task.Id == id);
    }

    public async Task<TaskDto> CreateTaskAsync(string userId, TaskDto task, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        state.Tasks.RemoveAll(existing => existing.Id == task.Id);
        state.Tasks.Add(task);
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return task;
    }

    public async Task<bool> UpdateTaskAsync(string userId, string id, TaskDto task, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(id, task.Id, StringComparison.Ordinal))
        {
            return false;
        }

        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        var index = state.Tasks.FindIndex(existing => existing.Id == id);
        if (index < 0)
        {
            return false;
        }

        state.Tasks[index] = task;
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteTaskAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        var removed = state.Tasks.RemoveAll(task => task.Id == id) > 0;
        if (!removed)
        {
            return false;
        }

        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return true;
    }

    public async Task<List<ProjectDto>> GetProjectsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        return state.Projects;
    }

    public async Task<ProjectDto?> GetProjectAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        return state.Projects.FirstOrDefault(project => project.Id == id);
    }

    public async Task<ProjectDto> CreateProjectAsync(string userId, ProjectDto project, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        state.Projects.RemoveAll(existing => existing.Id == project.Id);
        state.Projects.Add(project);
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return project;
    }

    public async Task<bool> UpdateProjectAsync(string userId, string id, ProjectDto project, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(id, project.Id, StringComparison.Ordinal))
        {
            return false;
        }

        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        var index = state.Projects.FindIndex(existing => existing.Id == id);
        if (index < 0)
        {
            return false;
        }

        state.Projects[index] = project;
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return true;
    }

    public async Task<bool> DeleteProjectAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        var removed = state.Projects.RemoveAll(project => project.Id == id) > 0;
        if (!removed)
        {
            return false;
        }

        state.Tasks.RemoveAll(task => task.ProjectId == id);
        state.ProjectSettings.Remove(id);
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
        return true;
    }

    public async Task<ProjectSettingsDto?> GetProjectSettingsAsync(
        string userId,
        string projectId,
        CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        return state.ProjectSettings.TryGetValue(projectId, out var settings) ? settings : null;
    }

    public async Task SaveProjectSettingsAsync(
        string userId,
        string projectId,
        ProjectSettingsDto settings,
        CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        state.ProjectSettings[projectId] = settings;
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
    }

    public async Task SaveUndoStateAsync(
        string userId,
        List<DeletedTaskDto> deletedTasks,
        List<DeletedProjectDto> deletedProjects,
        CancellationToken cancellationToken = default)
    {
        var state = await _dataStore.GetStateAsync(userId, cancellationToken);
        state.DeletedTasks = deletedTasks;
        state.DeletedProjects = deletedProjects;
        await _dataStore.SaveStateAsync(userId, state, cancellationToken);
    }
}
