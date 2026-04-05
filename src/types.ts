export type TaskStatus = string;

export type TaskStatusOption = {
  id: TaskStatus;
  label: string;
  textColor: string;
  backgroundColor: string;
};

export type ProjectStatus =
  | "Backlog"
  | "Todo"
  | "InProgress"
  | "Review"
  | "Done";

export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  text: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  projectId: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  description?: string;
  isDefault?: boolean;
};

export type DeletedTask = {
  id: string;
  task: Task;
  index: number;
  timeoutId: number;
};

export type DeletedProject = {
  id: string;
  project: Project;
  index: number;
  fallbackProjectId: string;
  tasks: Task[];
  settings?: ProjectSettings;
  timeoutId: number;
  wasActive: boolean;
};

export type SortId = "flow" | "priority" | "created" | "title" | "status";

export type SortDirection = "asc" | "desc";

export type SortOption = {
  id: SortId;
  label: string;
  hint: string;
  supportsDirection: boolean;
};

export type ProjectSettings = {
  statusOptions: TaskStatusOption[];
  statusFilters: TaskStatus[];
  sortId: SortId;
  sortDirection: SortDirection;
};

export type ThemeMode = "light" | "dark";

export type GlobalSettings = {
  themeMode: ThemeMode;
};
