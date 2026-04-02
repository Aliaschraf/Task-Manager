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

const resolveBaseUrl = () => {


  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBaseUrl) {
      console.log("Resolving base URL for API requests...");
    return envBaseUrl;
  }
  
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    const port = isLocalhost ? 5079 : 8080;
    console.log(`Resolved base URL: http://${host}:${port}`);
    return `http://${host}:${port}`;
  }

  return "http://localhost:5079";
};

const baseUrl = resolveBaseUrl().replace(/\/+$/, "");

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
