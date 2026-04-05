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
  buildMarkdownFilename,
  buildProjectMarkdown,
  parseImportedMarkdown,
} from "./features/projects/markdown";
import {
  createStatusOption,
  findStatusByLabel,
  getDefaultStatusId,
  mergeStatusOptions,
  normalizeStatusOptions,
  cloneDefaultStatusOptions,
} from "./features/tasks/statusOptions";
import { sortTasks } from "./features/tasks/sorting";
import {
  DEFAULT_TASK_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_PALETTE,
  PROJECT_STATUS_OPTIONS,
  SORT_OPTIONS,
  createDefaultProjectSettings,
  DEFAULT_GLOBAL_SETTINGS,
} from "./constants";
import type {
  DeletedProject,
  DeletedTask,
  GlobalSettings,
  Project,
  ProjectSettings,
  ProjectStatus,
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
import { createEntityId, createToastId } from "./utils/id";

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
  const initialProjectId = useRef(createEntityId());
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
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(
    DEFAULT_GLOBAL_SETTINGS,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    initialProjectId.current = createEntityId();
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
    setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
    setExportFields(defaultExportFields);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = globalSettings.themeMode;
  }, [globalSettings.themeMode]);

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

  const sortOptions: SortOption[] = SORT_OPTIONS;

  const activeSort = useMemo(
    () => sortOptions.find((option) => option.id === sortId) ?? sortOptions[0],
    [sortId, sortOptions],
  );

  const sortedItems = useMemo(
    () => sortTasks(filteredItems, sortId, sortDirection, statusOptions),
    [filteredItems, sortDirection, sortId, statusOptions],
  );

  const createTask = (text: string): Task => ({
    id: createEntityId(),
    text,
    status: getDefaultStatusId(statusOptions),
    priority: "Low",
    createdAt: Date.now(),
    projectId: currentProjectId,
  });

  const createProject = (name: string): Project => ({
    id: createEntityId(),
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
        setGlobalSettings(state.globalSettings ?? DEFAULT_GLOBAL_SETTINGS);
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
      globalSettings,
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
    globalSettings,
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

      const toastId = createToastId(removedTask.id);
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
    const toastId = createToastId(projectId);
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

  const markdownPreview = useMemo(
    () =>
      buildProjectMarkdown({
        activeProject,
        sortedItems,
        statusOptionMap,
        exportFields,
      }),
    [activeProject, exportFields, sortedItems, statusOptionMap],
  );

  const handleExportMarkdown = () => {
    if (!markdownPreview) {
      return;
    }

    const filename = buildMarkdownFilename(
      activeProject?.name,
      exportFields.projectName,
    );

    const blob = new Blob([markdownPreview], {
      type: "text/markdown;charset=utf-8",
    });
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
    if (!markdownPreview) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdownPreview);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = markdownPreview;
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

  const handleToggleThemeMode = () => {
    setGlobalSettings((prev) => ({
      ...prev,
      themeMode: prev.themeMode === "light" ? "dark" : "light",
    }));
  };

  const handleLogoutAndClose = async () => {
    await handleLogout();
    setIsSettingsOpen(false);
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
          id: createEntityId(),
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
      <div className="app-layout">
        {!isFocusMode && (
          <header className="app-header">
            <div>
              <p className="app-header-kicker">Task Manager</p>
              <h1 className="app-header-title">Projects & tasks</h1>
              <p className="app-header-subtitle">
                Keep your work organized across every project.
              </p>
            </div>
            <div className="app-header-actions">
              <button
                type="button"
                className="app-header-button"
                onClick={() => setIsFocusMode(true)}
              >
                Focus mode
              </button>
              <button
                type="button"
                className="app-header-button"
                onClick={() => setIsSettingsOpen(true)}
              >
                Settings
              </button>
            </div>
          </header>
        )}
        <div className={`app-shell${isFocusMode ? " app-shell--focus" : ""}`}>
          {!isFocusMode && (
            <ProjectSidebar
              projects={visibleProjects}
              totalProjects={projects.length}
              activeProjectId={currentProjectId}
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
              <div className="app-title-actions">
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
                        <span className="status-edit-label">
                          {status.label}
                        </span>
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
              previewMarkdown={markdownPreview}
            />
          </div>
        </div>
      </div>
      {isSettingsOpen && (
        <div
          className="settings-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="settings-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-modal-header">
              <div>
                <p className="settings-kicker">Preferences</p>
                <h2 className="settings-title">App settings</h2>
                <p className="settings-subtitle">
                  Switch themes and manage your session.
                </p>
              </div>
              <button
                type="button"
                className="settings-close"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
              >
                x
              </button>
            </div>
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <span className="settings-label">Dark mode</span>
                  <span className="settings-hint">
                    Switch between light and dark theme.
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-toggle${
                    globalSettings.themeMode === "dark" ? " is-on" : ""
                  }`}
                  onClick={handleToggleThemeMode}
                  aria-pressed={globalSettings.themeMode === "dark"}
                  aria-checked={globalSettings.themeMode === "dark"}
                  role="switch"
                >
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                  <span className="settings-toggle-label">
                    {globalSettings.themeMode === "dark" ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>
            <div className="settings-section settings-section--danger">
              <div className="settings-row">
                <div>
                  <span className="settings-label">Log out</span>
                  <span className="settings-hint">
                    Sign out of your current session.
                  </span>
                </div>
                <button
                  type="button"
                  className="settings-logout"
                  onClick={handleLogoutAndClose}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
