import type {
  GlobalSettings,
  ProjectSettings,
  ProjectStatus,
  SortOption,
  TaskPriority,
  TaskStatus,
  TaskStatusOption,
} from "./types";

export const DEFAULT_TASK_STATUS_OPTIONS: TaskStatusOption[] = [
  {
    id: "backlog",
    label: "Backlog",
    textColor: "#475569",
    backgroundColor: "#f1f5f9",
  },
  {
    id: "todo",
    label: "Todo",
    textColor: "#92400e",
    backgroundColor: "#fef3c7",
  },
  {
    id: "inprogress",
    label: "InProgress",
    textColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
  },
  {
    id: "review",
    label: "Review",
    textColor: "#7e22ce",
    backgroundColor: "#f3e8ff",
  },
  {
    id: "done",
    label: "Done",
    textColor: "#166534",
    backgroundColor: "#dcfce7",
  },
];

export const STATUS_COLOR_POOL: Array<{
  textColor: string;
  backgroundColor: string;
}> = [
  { textColor: "#475569", backgroundColor: "#f1f5f9" },
  { textColor: "#92400e", backgroundColor: "#fef3c7" },
  { textColor: "#1d4ed8", backgroundColor: "#dbeafe" },
  { textColor: "#7e22ce", backgroundColor: "#f3e8ff" },
  { textColor: "#166534", backgroundColor: "#dcfce7" },
  { textColor: "#0f766e", backgroundColor: "#ccfbf1" },
  { textColor: "#be123c", backgroundColor: "#ffe4e6" },
  { textColor: "#4338ca", backgroundColor: "#e0e7ff" },
  { textColor: "#0369a1", backgroundColor: "#e0f2fe" },
  { textColor: "#3f6212", backgroundColor: "#ecfccb" },
  { textColor: "#9a3412", backgroundColor: "#ffedd5" },
  { textColor: "#0e7490", backgroundColor: "#cffafe" },
];

export const DEFAULT_TASK_STATUSES: TaskStatus[] =
  DEFAULT_TASK_STATUS_OPTIONS.map((option) => option.label);

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  "Backlog",
  "Todo",
  "InProgress",
  "Review",
  "Done",
];

export const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];

export const STATUS_CLASS_MAP: Record<string, string> = {
  Backlog: "backlog",
  Todo: "todo",
  InProgress: "inprogress",
  Review: "review",
  Done: "done",
};

export const getStatusClassName = (status: string) =>
  STATUS_CLASS_MAP[status] ?? "custom";

export const PROJECT_PALETTE = [
  "#0f766e",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#22c55e",
  "#e11d48",
];

export const HOLD_DURATION_MS = 700;

export const SORT_OPTIONS: SortOption[] = [
  {
    id: "flow",
    label: "Flow",
    hint: "Status > Priority > Newest",
    supportsDirection: false,
  },
  {
    id: "priority",
    label: "Priority",
    hint: "High to Low",
    supportsDirection: true,
  },
  {
    id: "created",
    label: "Created",
    hint: "Newest first",
    supportsDirection: true,
  },
  {
    id: "title",
    label: "Title",
    hint: "Alphabetical",
    supportsDirection: true,
  },
  {
    id: "status",
    label: "Status",
    hint: "Backlog to Done",
    supportsDirection: true,
  },
];

export const createDefaultProjectSettings = (): ProjectSettings => ({
  statusOptions: DEFAULT_TASK_STATUS_OPTIONS.map((option) => ({ ...option })),
  statusFilters: DEFAULT_TASK_STATUS_OPTIONS.map((option) => option.id),
  sortId: "flow",
  sortDirection: "desc",
});

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  themeMode: "light",
};
