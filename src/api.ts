import type {
  DeletedProject,
  DeletedTask,
  Project,
  ProjectSettings,
  ProjectStatus,
  Task,
} from "./types";
import type { ExportFields } from "./components/ExportDialog";

export type AppState = {
  tasks: Task[];
  projects: Project[];
  projectSettings: Record<string, ProjectSettings>;
  deletedTasks: DeletedTask[];
  deletedProjects: DeletedProject[];
  activeProjectId?: string;
  projectStatusFilters: ProjectStatus[];
  isFocusMode: boolean;
  exportFields?: ExportFields;
};

const baseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5079"
).replace(/\/+$/, "");

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `API request failed (${response.status}): ${message || response.statusText}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const getAppState = () => request<AppState>("/api/state");

export const saveAppState = (state: AppState) =>
  request<void>("/api/state", {
    method: "PUT",
    body: JSON.stringify(state),
  });
