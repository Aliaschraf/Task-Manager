import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterBar from "./components/FilterBar";
import ListBox from "./components/Listbox";
import ProjectSidebar from "./components/ProjectSidebar";
import SortBar from "./components/SortBar";
import TextBox from "./components/Textbox";
import ProjectUndoToastStack from "./components/ProjectUndoToastStack";
import UndoToastStack from "./components/UndoToastStack";
import ExportDialog from "./components/ExportDialog";
import {
  DEFAULT_TASK_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_PALETTE,
  PROJECT_STATUS_OPTIONS,
  STATUS_COLOR_POOL,
  SORT_OPTIONS,
  createDefaultProjectSettings,
} from "./constants";
import type {
  DeletedProject,
  DeletedTask,
  Project,
  ProjectSettings,
  ProjectStatus,
  SortDirection,
  SortId,
  SortOption,
  Task,
  TaskPriority,
  TaskStatus,
  TaskStatusOption,
} from "./types";
import useAutoResizeTextarea from "./hooks/useAutoResizeTextarea";
import type { ExportFieldId, ExportFields } from "./components/ExportDialog";
import AuthPanel from "./components/AuthPanel";
import {
  getAppState,
  getSession,
  logout,
  saveAppState,
  type AuthSession,
} from "./api";

const defaultExportFields: ExportFields = {
  projectName: true,
  projectDescription: true,
  projectStatus: false,
  taskStatus: true,
  taskPriority: true,
  taskCreated: false,
};

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Task[]>([]);
  const initialProjectId = useRef(
    `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [isStatusEditMode, setIsStatusEditMode] = useState(false);
  const [draggingStatusId, setDraggingStatusId] = useState<string | null>(null);
  const statusListRef = useRef<HTMLUListElement | null>(null);
  const lastStatusReorderRef = useRef<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => [
    {
      id: initialProjectId.current,
      name: "General",
      color: PROJECT_PALETTE[0],
      status: "Todo",
      description: "",
      isDefault: true,
    },
  ]);
  const [activeProjectId, setActiveProjectId] = useState(
    initialProjectId.current,
  );
  const [projectSettings, setProjectSettings] = useState<
    Record<string, ProjectSettings>
  >(() => ({
    [initialProjectId.current]: createDefaultProjectSettings(),
  }));
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<DeletedProject[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [exportFields, setExportFields] =
    useState<ExportFields>(defaultExportFields);
  const [projectStatusFilters, setProjectStatusFilters] = useState<
    ProjectStatus[]
  >(PROJECT_STATUS_OPTIONS);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const pendingDeleteIds = useRef(new Set<string>());
  const pendingProjectDeleteIds = useRef(new Set<string>());
  const isHydratingRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);
  const currentProjectId = useMemo(
    () =>
      projects.find((project) => project.id === activeProjectId)?.id ??
      projects[0]?.id ??
      "",
    [activeProjectId, projects],
  );
  const visibleProjects = useMemo(
    () =>
      projects.filter((project) =>
        projectStatusFilters.includes(project.status),
      ),
    [projectStatusFilters, projects],
  );
  const visibleProjectIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects],
  );
  const activeProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId),
    [currentProjectId, projects],
  );
  const activeSettings = useMemo(
    () => projectSettings[currentProjectId] ?? createDefaultProjectSettings(),
    [currentProjectId, projectSettings],
  );
  const statusOptions =
    activeSettings.statusOptions ??
    DEFAULT_TASK_STATUS_OPTIONS.map((option) => ({ ...option }));
  const statusFilters = activeSettings.statusFilters;
  const sortId = activeSettings.sortId;
  const sortDirection = activeSettings.sortDirection;
  const isAllSelected = statusFilters.length === statusOptions.length;
  const statusOptionMap = useMemo(
    () => new Map(statusOptions.map((option) => [option.id, option])),
    [statusOptions],
  );
  const projectStatusCounts = useMemo(
    () =>
      PROJECT_STATUS_OPTIONS.reduce<Record<ProjectStatus, number>>(
        (acc, status) => {
          acc[status] = projects.filter(
            (project) => project.status === status,
          ).length;
          return acc;
        },
        {
          Backlog: 0,
          Todo: 0,
          InProgress: 0,
          Review: 0,
          Done: 0,
        },
      ),
    [projects],
  );

  const resizeTitleTextarea = useAutoResizeTextarea(
    titleTextareaRef,
    titleDraft,
    {
      enabled: isTitleEditing,
    },
  );

  const resizeDescriptionTextarea = useAutoResizeTextarea(
    descriptionTextareaRef,
    descriptionDraft,
    {
      enabled: isDescriptionEditing,
    },
  );

  const resetLocalState = useCallback(() => {
    initialProjectId.current = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingDeleteIds.current.clear();
    pendingProjectDeleteIds.current.clear();
    setItems([]);
    setProjects([
      {
        id: initialProjectId.current,
        name: "General",
        color: PROJECT_PALETTE[0],
        status: "Todo",
        description: "",
        isDefault: true,
      },
    ]);
    setActiveProjectId(initialProjectId.current);
    setProjectSettings({
      [initialProjectId.current]: createDefaultProjectSettings(),
    });
    setDeletedTasks([]);
    setDeletedProjects([]);
    setProjectStatusFilters(PROJECT_STATUS_OPTIONS);
    setIsFocusMode(false);
    setExportFields(defaultExportFields);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const current = await getSession();
        if (isMounted) {
          setSession(current);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentProjectId || currentProjectId === activeProjectId) {
      return;
    }
    setActiveProjectId(currentProjectId);
  }, [activeProjectId, currentProjectId]);

  useEffect(() => {
    if (!visibleProjects.length) {
      return;
    }

    if (visibleProjectIds.has(activeProjectId)) {
      return;
    }

    setActiveProjectId(visibleProjects[0].id);
  }, [activeProjectId, visibleProjectIds, visibleProjects]);

  useEffect(() => {
    if (isTitleEditing && titleTextareaRef.current) {
      titleTextareaRef.current.focus();
      titleTextareaRef.current.select();
      resizeTitleTextarea();
    }
  }, [isTitleEditing, resizeTitleTextarea]);

  useEffect(() => {
    if (isDescriptionEditing && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
      resizeDescriptionTextarea();
    }
  }, [isDescriptionEditing, resizeDescriptionTextarea]);

  useEffect(() => {
    if (isTitleEditing) {
      return;
    }
    setTitleDraft(activeProject?.name ?? "");
  }, [activeProject?.name, isTitleEditing]);

  useEffect(() => {
    if (isDescriptionEditing) {
      return;
    }
    setDescriptionDraft(activeProject?.description ?? "");
  }, [activeProject?.description, isDescriptionEditing]);

  const updateActiveSettings = (
    updater: (current: ProjectSettings) => ProjectSettings,
  ) => {
    if (!currentProjectId) {
      return;
    }

    setProjectSettings((prev) => {
      const current = prev[currentProjectId] ?? createDefaultProjectSettings();
      return {
        ...prev,
        [currentProjectId]: updater(current),
      };
    });
  };

  const projectCounts = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.projectId] = (acc[item.projectId] ?? 0) + 1;
        return acc;
      }, {}),
    [items],
  );

  const activeItems = useMemo(
    () =>
      currentProjectId
        ? items.filter((item) => item.projectId === currentProjectId)
        : [],
    [currentProjectId, items],
  );

  const statusCounts = useMemo(
    () =>
      statusOptions.reduce<Record<TaskStatus, number>>((acc, status) => {
        acc[status.id] = activeItems.filter(
          (item) => item.status === status.id,
        ).length;
        return acc;
      }, {}),
    [activeItems, statusOptions],
  );
  const totalCount = activeItems.length;

  const filteredItems = useMemo(
    () =>
      isAllSelected
        ? activeItems
        : activeItems.filter((item) => statusFilters.includes(item.status)),
    [activeItems, isAllSelected, statusFilters],
  );

  const statusOrder = useMemo(
    () => new Map(statusOptions.map((status, index) => [status.id, index])),
    [statusOptions],
  );
  const priorityOrder: Record<TaskPriority, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
  };

  const sortOptions: SortOption[] = SORT_OPTIONS;

  const activeSort = useMemo(
    () => sortOptions.find((option) => option.id === sortId) ?? sortOptions[0],
    [sortId, sortOptions],
  );

  const compareBy = (
    a: Task,
    b: Task,
    compareFns: Array<(left: Task, right: Task) => number>,
  ) => {
    for (const compareFn of compareFns) {
      const result = compareFn(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };

  const directionFactor = sortDirection === "asc" ? 1 : -1;

  const sortedItems = useMemo(
    () =>
      filteredItems
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          let result = 0;
          switch (sortId) {
            case "flow":
              result = compareBy(a.item, b.item, [
                (left, right) =>
                  (statusOrder.get(left.status) ?? 0) -
                  (statusOrder.get(right.status) ?? 0),
                (left, right) =>
                  priorityOrder[right.priority] - priorityOrder[left.priority],
                (left, right) => right.createdAt - left.createdAt,
              ]);
              break;
            case "priority":
              result =
                directionFactor *
                (priorityOrder[a.item.priority] -
                  priorityOrder[b.item.priority]);
              break;
            case "created":
              result = directionFactor * (a.item.createdAt - b.item.createdAt);
              break;
            case "title":
              result =
                directionFactor *
                a.item.text.localeCompare(b.item.text, undefined, {
                  sensitivity: "base",
                });
              break;
            case "status":
              result =
                directionFactor *
                ((statusOrder.get(a.item.status) ?? 0) -
                  (statusOrder.get(b.item.status) ?? 0));
              break;
            default:
              result = 0;
          }

          return result === 0 ? a.index - b.index : result;
        })
        .map((entry) => entry.item),
    [directionFactor, filteredItems, priorityOrder, sortId, statusOrder],
  );

  const cloneDefaultStatusOptions = () =>
    DEFAULT_TASK_STATUS_OPTIONS.map((option) => ({ ...option }));

  const getDefaultStatusId = (options: TaskStatusOption[]) =>
    options.find((status) => status.label.toLowerCase() === "todo")?.id ??
    options[0]?.id ??
    "todo";

  const findStatusByLabel = (options: TaskStatusOption[], label: string) =>
    options.find(
      (status) => status.label.toLowerCase() === label.toLowerCase(),
    );

  const buildStatusId = (
    label: string,
    existing: TaskStatusOption[],
  ): string => {
    const base =
      label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "status";
    const existingIds = new Set(existing.map((option) => option.id));
    if (!existingIds.has(base)) {
      return base;
    }

    let index = 2;
    while (existingIds.has(`${base}-${index}`)) {
      index += 1;
    }
    return `${base}-${index}`;
  };

  const pickRandomStatusColors = (existing: TaskStatusOption[]) => {
    const used = new Set(
      existing.map((option) => `${option.textColor}|${option.backgroundColor}`),
    );
    const available = STATUS_COLOR_POOL.filter(
      (entry) => !used.has(`${entry.textColor}|${entry.backgroundColor}`),
    );
    const pool = available.length ? available : STATUS_COLOR_POOL;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const getDefaultColorsForLabel = (
    label: string,
    existing: TaskStatusOption[],
  ) => {
    const match = DEFAULT_TASK_STATUS_OPTIONS.find(
      (option) => option.label.toLowerCase() === label.toLowerCase(),
    );

    if (match) {
      return {
        textColor: match.textColor,
        backgroundColor: match.backgroundColor,
      };
    }

    return pickRandomStatusColors(existing);
  };

  const createStatusOption = (
    label: string,
    existing: TaskStatusOption[],
  ): TaskStatusOption => {
    const colors = getDefaultColorsForLabel(label, existing);
    return {
      id: buildStatusId(label, existing),
      label: label.trim(),
      textColor: colors.textColor,
      backgroundColor: colors.backgroundColor,
    };
  };

  const normalizeStatusOptions = (options: TaskStatusOption[]) => {
    const next: TaskStatusOption[] = [];
    const seen = new Set<string>();

    options.forEach((option) => {
      const label = option.label.trim();
      if (!label) {
        return;
      }

      if (seen.has(option.id)) {
        return;
      }

      seen.add(option.id);
      next.push({ ...option, label });
    });

    return next.length ? next : cloneDefaultStatusOptions();
  };

  const mergeStatusOptions = (base: TaskStatusOption[], incoming: string[]) => {
    const next = [...base.map((option) => ({ ...option }))];

    incoming.forEach((label) => {
      if (!label.trim()) {
        return;
      }

      if (findStatusByLabel(next, label)) {
        return;
      }

      next.push(createStatusOption(label, next));
    });

    return normalizeStatusOptions(next);
  };

  const createTask = (text: string): Task => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    status: getDefaultStatusId(statusOptions),
    priority: "Low",
    createdAt: Date.now(),
    projectId: currentProjectId,
  });

  const createProject = (name: string): Project => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    color: PROJECT_PALETTE[projects.length % PROJECT_PALETTE.length],
    status: "Todo",
    description: "",
  });

  const scheduleDeletedTaskTimeouts = (entries: DeletedTask[]) =>
    entries.map((entry) => {
      pendingDeleteIds.current.add(entry.task.id);
      const timeoutId = window.setTimeout(() => {
        setDeletedTasks((prev) => prev.filter((item) => item.id !== entry.id));
        pendingDeleteIds.current.delete(entry.task.id);
      }, 8000);

      return { ...entry, timeoutId };
    });

  const scheduleDeletedProjectTimeouts = (entries: DeletedProject[]) =>
    entries.map((entry) => {
      pendingProjectDeleteIds.current.add(entry.project.id);
      const timeoutId = window.setTimeout(() => {
        setDeletedProjects((prev) =>
          prev.filter((item) => item.id !== entry.id),
        );
        pendingProjectDeleteIds.current.delete(entry.project.id);
      }, 8000);

      return { ...entry, timeoutId };
    });

  const normalizeProjectSettings = (
    settings: Record<string, ProjectSettings>,
    nextProjects: Project[],
  ) => {
    const normalized = { ...settings };
    nextProjects.forEach((project) => {
      if (!normalized[project.id]) {
        normalized[project.id] = createDefaultProjectSettings();
      }
    });
    return normalized;
  };

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (!session) {
        return;
      }

      isHydratingRef.current = true;

      try {
        const state = await getAppState();
        if (!isMounted) {
          return;
        }

        if (!state.projects?.length) {
          resetLocalState();
          return;
        }

        pendingDeleteIds.current.clear();
        pendingProjectDeleteIds.current.clear();

        const normalizedSettings = normalizeProjectSettings(
          state.projectSettings ?? {},
          state.projects,
        );
        const nextActiveProjectId =
          state.activeProjectId &&
          state.projects.some((project) => project.id === state.activeProjectId)
            ? state.activeProjectId
            : (state.projects[0]?.id ?? initialProjectId.current);

        setItems(state.tasks ?? []);
        setProjects(state.projects);
        setProjectSettings(normalizedSettings);
        setActiveProjectId(nextActiveProjectId);
        setProjectStatusFilters(
          state.projectStatusFilters?.length
            ? state.projectStatusFilters
            : PROJECT_STATUS_OPTIONS,
        );
        setIsFocusMode(Boolean(state.isFocusMode));
        if (state.exportFields) {
          setExportFields(state.exportFields);
        }

        setDeletedTasks(scheduleDeletedTaskTimeouts(state.deletedTasks ?? []));
        setDeletedProjects(
          scheduleDeletedProjectTimeouts(state.deletedProjects ?? []),
        );
      } catch (error) {
        console.error("Failed to load app state", error);
      } finally {
        if (isMounted) {
          isHydratingRef.current = false;
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [resetLocalState, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (isHydratingRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    const payload = {
      tasks: items,
      projects,
      projectSettings,
      deletedTasks: deletedTasks.map((entry) => ({
        ...entry,
        timeoutId: 0,
      })),
      deletedProjects: deletedProjects.map((entry) => ({
        ...entry,
        timeoutId: 0,
      })),
      activeProjectId,
      projectStatusFilters,
      isFocusMode,
      exportFields,
    };

    saveTimerRef.current = window.setTimeout(() => {
      saveAppState(payload).catch((error) => {
        console.error("Failed to save app state", error);
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    session,
    activeProjectId,
    deletedProjects,
    deletedTasks,
    exportFields,
    isFocusMode,
    items,
    projectSettings,
    projectStatusFilters,
    projects,
  ]);

  const handleEnter = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (!currentProjectId) {
      return;
    }

    setItems((prev) => [createTask(trimmed), ...prev]);
    setValue("");
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const handlePriorityChange = (id: string, priority: TaskPriority) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, priority } : item)),
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => {
      if (pendingDeleteIds.current.has(id)) {
        return prev;
      }

      const targetIndex = prev.findIndex((item) => item.id === id);
      if (targetIndex === -1) {
        return prev;
      }

      const removedTask = prev[targetIndex];
      const next = prev.filter((item) => item.id !== id);
      pendingDeleteIds.current.add(id);

      const toastId = `${removedTask.id}-${Date.now()}`;
      const timeoutId = window.setTimeout(() => {
        setDeletedTasks((prev) => prev.filter((entry) => entry.id !== toastId));
        pendingDeleteIds.current.delete(removedTask.id);
      }, 8000);

      setDeletedTasks((prev) => [
        { id: toastId, task: removedTask, index: targetIndex, timeoutId },
        ...prev,
      ]);

      return next;
    });
  };

  const handleEdit = (id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const handleUndoDelete = (toastId: string) => {
    setDeletedTasks((prev) => {
      const target = prev.find((entry) => entry.id === toastId);
      if (!target) {
        return prev;
      }

      clearTimeout(target.timeoutId);

      setItems((itemsPrev) => {
        if (itemsPrev.some((item) => item.id === target.task.id)) {
          return itemsPrev;
        }

        const next = [...itemsPrev];
        const insertIndex = Math.min(target.index, next.length);
        next.splice(insertIndex, 0, target.task);
        return next;
      });

      pendingDeleteIds.current.delete(target.task.id);

      return prev.filter((entry) => entry.id !== toastId);
    });
  };

  const handleToggleAll = () => {
    updateActiveSettings((current) => ({
      ...current,
      statusFilters: statusOptions.map((status) => status.id),
    }));
  };

  const handleToggleStatus = (status: TaskStatus) => {
    updateActiveSettings((current) => {
      const next = current.statusFilters.includes(status)
        ? current.statusFilters.filter((item) => item !== status)
        : [...current.statusFilters, status];

      return {
        ...current,
        statusFilters:
          next.length === 0 ? statusOptions.map((option) => option.id) : next,
      };
    });
  };

  const handleUpdateTaskStatuses = (
    projectId: string,
    nextOptions: TaskStatusOption[],
  ) => {
    const normalized = normalizeStatusOptions(nextOptions);
    const fallbackStatus = getDefaultStatusId(normalized);
    const nextIds = normalized.map((option) => option.id);

    setProjectSettings((prev) => {
      const current = prev[projectId] ?? createDefaultProjectSettings();
      const isAllSelectedCurrent =
        current.statusFilters.length === current.statusOptions.length;
      const filtered = current.statusFilters.filter((status) =>
        nextIds.includes(status),
      );
      const nextFilters = isAllSelectedCurrent
        ? nextIds
        : filtered.length
          ? filtered
          : nextIds;

      return {
        ...prev,
        [projectId]: {
          ...current,
          statusOptions: normalized,
          statusFilters: nextFilters,
        },
      };
    });

    setItems((prev) =>
      prev.map((item) =>
        item.projectId === projectId && !nextIds.includes(item.status)
          ? { ...item, status: fallbackStatus }
          : item,
      ),
    );
  };

  const handleAddStatus = () => {
    if (!currentProjectId) {
      return;
    }

    const trimmed = statusDraft.trim();
    if (!trimmed) {
      return;
    }

    handleUpdateTaskStatuses(currentProjectId, [
      ...statusOptions,
      createStatusOption(trimmed, statusOptions),
    ]);
    setStatusDraft("");
  };

  const handleRemoveStatus = (statusId: TaskStatus) => {
    if (!currentProjectId) {
      return;
    }

    if (statusOptions.length <= 1) {
      return;
    }

    handleUpdateTaskStatuses(
      currentProjectId,
      statusOptions.filter((option) => option.id !== statusId),
    );
  };

  const shouldIgnoreStatusDrag = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.closest(".status-drag-handle")) {
      return false;
    }

    return Boolean(target.closest("input, button, [data-no-drag]"));
  };

  const getClosestStatusTarget = (clientY: number) => {
    const list = statusListRef.current;
    if (!list) {
      return null;
    }

    const items = Array.from(
      list.querySelectorAll<HTMLLIElement>("[data-status-id]"),
    );

    let closest: { id: string; position: "before" | "after" } | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - midpoint);
      if (distance < minDistance) {
        minDistance = distance;
        closest = {
          id: item.dataset.statusId ?? "",
          position: clientY < midpoint ? "before" : "after",
        };
      }
    }

    if (!closest?.id) {
      return null;
    }

    return closest;
  };

  const handleReorderStatus = (
    statusId: string,
    targetId: string,
    position: "before" | "after",
  ) => {
    if (statusId === targetId) {
      return;
    }

    updateActiveSettings((current) => {
      const fromIndex = current.statusOptions.findIndex(
        (option) => option.id === statusId,
      );
      if (fromIndex === -1) {
        return current;
      }

      const next = [...current.statusOptions];
      const [moved] = next.splice(fromIndex, 1);
      const targetIndex = next.findIndex((option) => option.id === targetId);
      if (targetIndex === -1) {
        return current;
      }

      const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertIndex, 0, moved);
      return {
        ...current,
        statusOptions: next,
      };
    });
  };

  const handleUpdateStatusColor = (
    statusId: string,
    field: "textColor" | "backgroundColor",
    value: string,
  ) => {
    updateActiveSettings((current) => ({
      ...current,
      statusOptions: current.statusOptions.map((option) =>
        option.id === statusId ? { ...option, [field]: value } : option,
      ),
    }));
  };

  const handleSortDirectionToggle = () => {
    if (!activeSort.supportsDirection) {
      return;
    }
    updateActiveSettings((current) => ({
      ...current,
      sortDirection: current.sortDirection === "asc" ? "desc" : "asc",
    }));
  };

  const handleSortChange = (id: SortId) => {
    updateActiveSettings((current) => ({ ...current, sortId: id }));
  };

  const handleCreateProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const project = createProject(trimmed);
    setProjects((prev) => [...prev, project]);
    setProjectSettings((prev) => ({
      ...prev,
      [project.id]: createDefaultProjectSettings(),
    }));
    setActiveProjectId(project.id);
  };

  const handleRenameProject = (projectId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, name: trimmed } : project,
      ),
    );
  };

  const beginTitleEdit = () => {
    if (!activeProject) {
      return;
    }
    setIsTitleEditing(true);
  };

  const commitTitleEdit = () => {
    if (!activeProject) {
      setIsTitleEditing(false);
      return;
    }

    const trimmed = titleDraft.trim();
    if (trimmed) {
      handleRenameProject(activeProject.id, trimmed);
    } else {
      setTitleDraft(activeProject.name);
    }
    setIsTitleEditing(false);
  };

  const cancelTitleEdit = () => {
    setIsTitleEditing(false);
    setTitleDraft(activeProject?.name ?? "");
  };

  const beginDescriptionEdit = () => {
    if (!activeProject) {
      return;
    }
    setIsDescriptionEditing(true);
  };

  const commitDescriptionEdit = () => {
    if (!activeProject) {
      setIsDescriptionEditing(false);
      return;
    }

    const trimmed = descriptionDraft.trim();
    setProjects((prev) =>
      prev.map((project) =>
        project.id === currentProjectId
          ? { ...project, description: trimmed }
          : project,
      ),
    );
    setIsDescriptionEditing(false);
  };

  const cancelDescriptionEdit = () => {
    setIsDescriptionEditing(false);
    setDescriptionDraft(activeProject?.description ?? "");
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      return;
    }

    if (pendingProjectDeleteIds.current.has(projectId)) {
      return;
    }

    const targetIndex = projects.findIndex(
      (project) => project.id === projectId,
    );
    if (targetIndex === -1) {
      return;
    }

    const fallbackProjectId =
      projects[targetIndex + 1]?.id ?? projects[targetIndex - 1]?.id;

    if (!fallbackProjectId) {
      return;
    }

    const targetProject = projects[targetIndex];
    const deletedProjectTasks = items.filter(
      (item) => item.projectId === projectId,
    );
    const toastId = `${projectId}-${Date.now()}`;
    pendingProjectDeleteIds.current.add(projectId);

    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setProjectSettings((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setItems((prev) => prev.filter((item) => item.projectId !== projectId));

    if (activeProjectId === projectId) {
      setActiveProjectId(fallbackProjectId);
    }

    const timeoutId = window.setTimeout(() => {
      setDeletedProjects((prev) =>
        prev.filter((entry) => entry.id !== toastId),
      );
      pendingProjectDeleteIds.current.delete(projectId);
    }, 8000);

    setDeletedProjects((prev) => [
      {
        id: toastId,
        project: targetProject,
        index: targetIndex,
        fallbackProjectId,
        tasks: deletedProjectTasks,
        settings: projectSettings[projectId],
        timeoutId,
        wasActive: activeProjectId === projectId,
      },
      ...prev,
    ]);
  };

  const handleProjectStatusChange = (
    projectId: string,
    status: ProjectStatus,
  ) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, status } : project,
      ),
    );
  };

  const handleToggleProjectStatus = (status: ProjectStatus) => {
    setProjectStatusFilters((prev) => {
      const next = prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status];

      return next.length === 0 ? PROJECT_STATUS_OPTIONS : next;
    });
  };

  const handleToggleAllProjectStatuses = () => {
    setProjectStatusFilters(PROJECT_STATUS_OPTIONS);
  };

  const handleUndoProjectDelete = (toastId: string) => {
    setDeletedProjects((prev) => {
      const target = prev.find((entry) => entry.id === toastId);
      if (!target) {
        return prev;
      }

      clearTimeout(target.timeoutId);

      setProjects((projectPrev) => {
        if (projectPrev.some((project) => project.id === target.project.id)) {
          return projectPrev;
        }

        const next = [...projectPrev];
        const insertIndex = Math.min(target.index, next.length);
        next.splice(insertIndex, 0, target.project);
        return next;
      });

      setProjectSettings((settingsPrev) => {
        if (settingsPrev[target.project.id]) {
          return settingsPrev;
        }

        return {
          ...settingsPrev,
          [target.project.id]:
            target.settings ?? createDefaultProjectSettings(),
        };
      });

      setItems((itemsPrev) => {
        const existingIds = new Set(itemsPrev.map((item) => item.id));
        const restored = target.tasks.filter(
          (item) => !existingIds.has(item.id),
        );
        return [...itemsPrev, ...restored];
      });

      if (target.wasActive) {
        setActiveProjectId(target.project.id);
      }

      pendingProjectDeleteIds.current.delete(target.project.id);

      return prev.filter((entry) => entry.id !== toastId);
    });
  };

  const handleReorderProject = (
    projectId: string,
    targetId: string,
    position: "before" | "after",
  ) => {
    if (projectId === targetId) {
      return;
    }

    setProjects((prev) => {
      const fromIndex = prev.findIndex((project) => project.id === projectId);
      if (fromIndex === -1) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const targetIndex = next.findIndex((project) => project.id === targetId);
      if (targetIndex === -1) {
        return prev;
      }

      const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertIndex, 0, moved);
      return next;
    });
  };

  const handleColorChange = (projectId: string, color: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, color } : project,
      ),
    );
  };

  const handleToggleExportField = (field: ExportFieldId) => {
    setExportFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const formatCreatedDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const parseImportedMarkdown = (content: string) => {
    const lines = content.split(/\r?\n/);
    const firstLine = lines.find((line) => line.trim().length > 0) ?? "";
    const headingMatch = firstLine.match(/^#+\s+(.*)$/);
    const projectName = headingMatch?.[1]?.trim() || "Imported Project";

    let projectStatus: ProjectStatus | null = null;
    const statusLine = lines.find((line) => line.startsWith("**Status:**"));
    if (statusLine) {
      const rawStatus = statusLine.replace("**Status:**", "").trim();
      projectStatus =
        PROJECT_STATUS_OPTIONS.find(
          (status) => status.toLowerCase() === rawStatus.toLowerCase(),
        ) ?? null;
    }

    let description = "";
    const descriptionIndex = lines.findIndex(
      (line) => line.trim() === "## Description",
    );
    if (descriptionIndex !== -1) {
      const descriptionLines: string[] = [];
      for (let i = descriptionIndex + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.trim().startsWith("## ") || line.trim().startsWith("# ")) {
          break;
        }
        descriptionLines.push(line);
      }
      description = descriptionLines.join("\n").trim();
    }

    const tasks: Array<{
      text: string;
      statusLabel: string;
      priority: TaskPriority;
      createdAt: number;
    }> = [];

    const tasksIndex = lines.findIndex((line) => line.trim() === "## Tasks");
    if (tasksIndex !== -1) {
      for (let i = tasksIndex + 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line.startsWith("- ")) {
          continue;
        }

        const itemText = line.slice(2).trim();
        if (!itemText) {
          continue;
        }

        const match = itemText.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
        const text = match?.[1]?.trim() ?? itemText;
        const detailText = match?.[2] ?? "";
        const details = detailText.split(" | ").map((part) => part.trim());

        let statusLabel = "Todo";
        let priority: TaskPriority = "Low";
        let createdAt = Date.now();

        details.forEach((detail) => {
          if (detail.startsWith("Status:")) {
            const raw = detail.replace("Status:", "").trim();
            statusLabel = raw || statusLabel;
          }
          if (detail.startsWith("Priority:")) {
            const raw = detail.replace("Priority:", "").trim();
            const mapped = PRIORITY_OPTIONS.find(
              (option) => option.toLowerCase() === raw.toLowerCase(),
            );
            if (mapped) {
              priority = mapped;
            }
          }
          if (detail.startsWith("Created:")) {
            const raw = detail.replace("Created:", "").trim();
            const parsed = Date.parse(raw);
            if (!Number.isNaN(parsed)) {
              createdAt = parsed;
            }
          }
        });

        tasks.push({ text, statusLabel, priority, createdAt });
      }
    }

    return { projectName, projectStatus, description, tasks };
  };

  const buildMarkdown = () => {
    if (!activeProject) {
      return "";
    }

    const lines: string[] = [];
    const heading = exportFields.projectName
      ? activeProject.name
      : "Task Export";
    lines.push(`# ${heading}`);

    if (exportFields.projectStatus) {
      lines.push("");
      lines.push(`**Status:** ${activeProject.status}`);
    }

    const description = activeProject.description?.trim();
    if (exportFields.projectDescription && description) {
      lines.push("");
      lines.push("## Description");
      lines.push(description);
    }

    lines.push("");
    lines.push("## Tasks");

    if (sortedItems.length === 0) {
      lines.push("- No tasks available.");
      return lines.join("\n");
    }

    sortedItems.forEach((item) => {
      const details: string[] = [];
      if (exportFields.taskStatus) {
        const label = statusOptionMap.get(item.status)?.label ?? item.status;
        details.push(`Status: ${label}`);
      }
      if (exportFields.taskPriority) {
        details.push(`Priority: ${item.priority}`);
      }
      if (exportFields.taskCreated) {
        details.push(`Created: ${formatCreatedDate(item.createdAt)}`);
      }

      const suffix = details.length ? ` (${details.join(" | ")})` : "";
      lines.push(`- ${item.text}${suffix}`);
    });

    return lines.join("\n");
  };

  const handleExportMarkdown = () => {
    const markdown = buildMarkdown();
    if (!markdown) {
      return;
    }

    const baseName = exportFields.projectName
      ? (activeProject?.name ?? "tasks")
      : "tasks";
    const normalized = baseName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `${normalized || "tasks"}-${dateStamp}.md`;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  const handleCopyMarkdown = async () => {
    const markdown = buildMarkdown();
    if (!markdown) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = markdown;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  const handleExportOpen = () => {
    setCopyStatus("idle");
    setIsExportOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setSession(null);
      resetLocalState();
    }
  };

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <p className="auth-kicker">Task Manager</p>
            <h1 className="auth-title">Checking your session...</h1>
            <p className="auth-subtitle">
              One moment while we load your workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPanel onSession={setSession} />;
  }

  const handleImportMarkdown = async (file: File) => {
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const { projectName, projectStatus, description, tasks } =
        parseImportedMarkdown(content);

      const importedStatusOptions = mergeStatusOptions(
        cloneDefaultStatusOptions(),
        tasks.map((task) => task.statusLabel),
      );
      const fallbackStatus = getDefaultStatusId(importedStatusOptions);
      const project = {
        ...createProject(projectName),
        status: projectStatus ?? "Todo",
        description,
      };

      setProjects((prev) => [...prev, project]);
      setProjectSettings((prev) => ({
        ...prev,
        [project.id]: {
          ...createDefaultProjectSettings(),
          statusOptions: importedStatusOptions,
          statusFilters: importedStatusOptions.map((option) => option.id),
        },
      }));
      setItems((prev) => [
        ...prev,
        ...tasks.map((task) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text: task.text,
          status:
            findStatusByLabel(importedStatusOptions, task.statusLabel)?.id ??
            fallbackStatus,
          priority: task.priority,
          createdAt: task.createdAt,
          projectId: project.id,
        })),
      ]);
      setActiveProjectId(project.id);
    } catch (error) {
      console.error("Failed to import project", error);
    }
  };

  return (
    <div className="app-page">
      <div className={`app-shell${isFocusMode ? " app-shell--focus" : ""}`}>
        {!isFocusMode && (
          <ProjectSidebar
            projects={visibleProjects}
            totalProjects={projects.length}
            activeProjectId={currentProjectId}
            isFocusMode={isFocusMode}
            projectCounts={projectCounts}
            onSelect={setActiveProjectId}
            onCreate={handleCreateProject}
            onDelete={handleDeleteProject}
            onReorder={handleReorderProject}
            onColorChange={handleColorChange}
            statusOptions={PROJECT_STATUS_OPTIONS}
            statusFilters={projectStatusFilters}
            statusCounts={projectStatusCounts}
            onToggleStatus={handleToggleProjectStatus}
            onToggleAll={handleToggleAllProjectStatuses}
            onStatusChange={handleProjectStatusChange}
            onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
            onExport={handleExportOpen}
            onImport={handleImportMarkdown}
            isExportDisabled={sortedItems.length === 0}
          />
        )}
        <div className="app-card">
          <div className="app-title-row">
            <div className="app-title-group">
              {isTitleEditing ? (
                <textarea
                  ref={titleTextareaRef}
                  className="listbox-textarea app-title-textarea"
                  value={titleDraft}
                  onChange={(event) => {
                    setTitleDraft(event.target.value);
                    resizeTitleTextarea();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      commitTitleEdit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      commitTitleEdit();
                    }
                  }}
                  onBlur={commitTitleEdit}
                  aria-label="Rename project"
                  rows={1}
                />
              ) : (
                <button
                  type="button"
                  className="listbox-text-button app-title-button"
                  onClick={beginTitleEdit}
                >
                  <span className="app-title">
                    {activeProject?.name ?? "Task List"}
                  </span>
                </button>
              )}
            </div>
            {isFocusMode && (
              <button
                type="button"
                className="focus-exit-button"
                onClick={() => setIsFocusMode(false)}
              >
                Show projects
              </button>
            )}
          </div>
          {(isDescriptionEditing || descriptionDraft.trim()) && (
            <div className="app-description-row">
              {isDescriptionEditing ? (
                <textarea
                  ref={descriptionTextareaRef}
                  className="listbox-textarea app-description-textarea"
                  value={descriptionDraft}
                  onChange={(event) => {
                    setDescriptionDraft(event.target.value);
                    resizeDescriptionTextarea();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      commitDescriptionEdit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      commitDescriptionEdit();
                    }
                  }}
                  onBlur={commitDescriptionEdit}
                  aria-label="Project description"
                  rows={2}
                />
              ) : (
                <button
                  type="button"
                  className="listbox-text-button app-description-button"
                  onClick={beginDescriptionEdit}
                >
                  <span className="app-description-text">
                    {descriptionDraft}
                  </span>
                </button>
              )}
            </div>
          )}
          {!isDescriptionEditing && !descriptionDraft.trim() && (
            <div className="app-description-add-row">
              <button
                type="button"
                className="app-description-add"
                onClick={beginDescriptionEdit}
              >
                Add a project description
              </button>
            </div>
          )}
          <SortBar
            sortOptions={sortOptions}
            sortId={sortId}
            sortDirection={sortDirection}
            activeSort={activeSort}
            onSortChange={handleSortChange}
            onToggleDirection={handleSortDirectionToggle}
          />
          <div className="status-panel">
            <div className="status-panel-header">
              <span className="status-panel-title">Task statuses</span>
              <button
                type="button"
                className={`status-panel-switch${
                  isStatusEditMode ? " is-on" : ""
                }`}
                onClick={() => setIsStatusEditMode((prev) => !prev)}
                aria-pressed={isStatusEditMode}
                aria-checked={isStatusEditMode}
                role="switch"
                aria-label={`Status mode: ${
                  isStatusEditMode ? "Edit" : "Filter"
                }`}
              >
                <span className="status-panel-switch-track">
                  <span className="status-panel-switch-thumb" />
                </span>
                <span className="status-panel-switch-label">
                  {isStatusEditMode ? "Editing" : "Filtering"}
                </span>
              </button>
            </div>
            {!isStatusEditMode ? (
              <FilterBar
                statusOptions={statusOptions}
                statusFilters={statusFilters}
                isAllSelected={isAllSelected}
                totalCount={totalCount}
                statusCounts={statusCounts}
                onToggleAll={handleToggleAll}
                onToggleStatus={handleToggleStatus}
              />
            ) : (
              <div className="status-panel-editor">
                <ul
                  ref={statusListRef}
                  className="status-edit-list"
                  onDragOver={(event) => {
                    if (!draggingStatusId) {
                      return;
                    }
                    event.preventDefault();

                    const closest = getClosestStatusTarget(event.clientY);
                    if (!closest || closest.id === draggingStatusId) {
                      return;
                    }

                    const reorderKey = `${draggingStatusId}:${closest.id}:${closest.position}`;
                    if (lastStatusReorderRef.current === reorderKey) {
                      return;
                    }
                    lastStatusReorderRef.current = reorderKey;
                    handleReorderStatus(
                      draggingStatusId,
                      closest.id,
                      closest.position,
                    );
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    lastStatusReorderRef.current = null;
                  }}
                >
                  {statusOptions.map((status) => (
                    <li
                      key={status.id}
                      data-status-id={status.id}
                      draggable
                      className={`status-edit-row${
                        draggingStatusId === status.id ? " is-dragging" : ""
                      }`}
                      onDragStart={(event) => {
                        if (shouldIgnoreStatusDrag(event.target)) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.setData("text/plain", status.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingStatusId(status.id);
                      }}
                      onDragEnd={() => {
                        setDraggingStatusId(null);
                        lastStatusReorderRef.current = null;
                      }}
                    >
                      <button
                        type="button"
                        className="status-drag-handle"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                      >
                        ::
                      </button>
                      <span className="status-edit-label">{status.label}</span>
                      <div className="status-color-controls">
                        <label className="status-color">
                          <span className="status-color-text">Text</span>
                          <input
                            type="color"
                            value={status.textColor}
                            onChange={(event) =>
                              handleUpdateStatusColor(
                                status.id,
                                "textColor",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label className="status-color">
                          <span className="status-color-text">Bg</span>
                          <input
                            type="color"
                            value={status.backgroundColor}
                            onChange={(event) =>
                              handleUpdateStatusColor(
                                status.id,
                                "backgroundColor",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="task-status-remove"
                        onClick={() => handleRemoveStatus(status.id)}
                        aria-label={`Remove ${status.label}`}
                        disabled={statusOptions.length <= 1}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="task-status-add">
                  <input
                    className="task-status-input"
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddStatus();
                      }
                    }}
                    placeholder="Add status"
                    aria-label="Add task status"
                  />
                  <button
                    type="button"
                    className="task-status-add-button"
                    onClick={handleAddStatus}
                  >
                    Add
                  </button>
                </div>
                <button
                  type="button"
                  className="focus-exit-button"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <TextBox
            value={value}
            onChange={setValue}
            onEnter={handleEnter}
            placeholder={"Type a task and press Enter to add it"}
          />
          <ListBox
            items={sortedItems}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onDelete={handleDelete}
            onEdit={handleEdit}
            priorityOptions={PRIORITY_OPTIONS}
            statusOptions={statusOptions}
          />
          {(deletedTasks.length > 0 || deletedProjects.length > 0) && (
            <div className="undo-toast-stack" aria-live="polite">
              <ProjectUndoToastStack
                deletedProjects={deletedProjects}
                onUndo={handleUndoProjectDelete}
              />
              <UndoToastStack
                deletedTasks={deletedTasks}
                onUndo={handleUndoDelete}
              />
            </div>
          )}
          <ExportDialog
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            onExport={handleExportMarkdown}
            onCopy={handleCopyMarkdown}
            fields={exportFields}
            onToggleField={handleToggleExportField}
            isExportDisabled={sortedItems.length === 0}
            copyStatus={copyStatus}
            previewMarkdown={buildMarkdown()}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
