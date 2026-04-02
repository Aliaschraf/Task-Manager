import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Project, ProjectStatus } from "../types";
import { HOLD_DURATION_MS, STATUS_CLASS_MAP } from "../constants";
import useHoldToDelete from "../hooks/useHoldToDelete";

type ProjectSidebarProps = {
  projects: Project[];
  totalProjects: number;
  activeProjectId: string;
  isFocusMode: boolean;
  isExportDisabled: boolean;
  projectCounts: Record<string, number>;
  statusOptions: ProjectStatus[];
  statusFilters: ProjectStatus[];
  statusCounts: Record<ProjectStatus, number>;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
  onDelete: (projectId: string) => void;
  onReorder: (
    projectId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
  onColorChange: (projectId: string, color: string) => void;
  onToggleStatus: (status: ProjectStatus) => void;
  onToggleAll: () => void;
  onStatusChange: (projectId: string, status: ProjectStatus) => void;
  onToggleFocusMode: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

function ProjectSidebar({
  projects,
  totalProjects,
  activeProjectId,
  isFocusMode,
  isExportDisabled,
  projectCounts,
  statusOptions,
  statusFilters,
  statusCounts,
  onSelect,
  onCreate,
  onDelete,
  onReorder,
  onColorChange,
  onToggleStatus,
  onToggleAll,
  onStatusChange,
  onToggleFocusMode,
  onExport,
  onImport,
}: ProjectSidebarProps) {
  const [draftName, setDraftName] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const lastReorderRef = useRef<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { holdingId, holdProgress, beginHold, endHold } =
    useHoldToDelete<HTMLButtonElement>({
      holdDurationMs: HOLD_DURATION_MS,
      onComplete: onDelete,
    });

  const handleCreate = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed);
    setDraftName("");
  };

  const isAllSelected = statusFilters.length === statusOptions.length;
  const sidebarProjects = isFocusMode
    ? projects.filter((project) => project.id === activeProjectId)
    : projects;

  const shouldIgnoreDragStart = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        "select, input, textarea, [data-no-drag], .project-color-swatch",
      ),
    );
  };

  const getClosestDragTarget = (clientY: number) => {
    const list = listRef.current;
    if (!list) {
      return null;
    }

    const items = Array.from(
      list.querySelectorAll<HTMLLIElement>("[data-project-id]"),
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
          id: item.dataset.projectId ?? "",
          position: clientY < midpoint ? "before" : "after",
        };
      }
    }

    if (!closest?.id) {
      return null;
    }

    return closest;
  };

  const getMarkdownFile = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return null;
    }

    const file = files[0];
    const isMarkdown =
      file.name.toLowerCase().endsWith(".md") || file.type.includes("markdown");
    return isMarkdown ? file : null;
  };

  const getMarkdownFileFromTransfer = (transfer: DataTransfer | null) => {
    if (!transfer) {
      return null;
    }

    const directFile = getMarkdownFile(transfer.files);
    if (directFile) {
      return directFile;
    }

    const item = Array.from(transfer.items ?? []).find(
      (entry) => entry.kind === "file",
    );
    const file = item?.getAsFile() ?? null;
    return file && getMarkdownFile({ 0: file, length: 1, item: () => file })
      ? file
      : null;
  };

  return (
    <aside
      className={`project-sidebar${draggingId ? " project-sidebar--dragging" : ""}`}
      onDragEnter={(event) => {
        if (event.dataTransfer?.types.includes("Files")) {
          setIsDropActive(true);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer?.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDropActive(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setIsDropActive(false);
      }}
      onDragEnd={() => setIsDropActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDropActive(false);
        const file = getMarkdownFileFromTransfer(event.dataTransfer);
        if (file) {
          onImport(file);
        }
      }}
    >
      {isDropActive && (
        <div className="project-dropzone" aria-hidden="true">
          Drop markdown to import
        </div>
      )}
      <div className="project-sidebar-header">
        <div>
          <div className="project-sidebar-title-row">
            <h2 className="project-sidebar-title">Projects</h2>
            {isFocusMode && <span className="project-focus-badge">Focus</span>}
          </div>
          <p className="project-sidebar-subtitle">{totalProjects} total</p>
        </div>
        <div className="project-sidebar-actions">
          <button
            type="button"
            className="project-actions-trigger"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            Actions
            <span aria-hidden="true">{isMenuOpen ? "−" : "+"}</span>
          </button>
          {isMenuOpen && (
            <div className="project-actions-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="project-actions-item"
                onClick={() => {
                  onToggleFocusMode();
                  setIsMenuOpen(false);
                }}
                aria-pressed={isFocusMode}
              >
                {isFocusMode ? "Focus: On" : "Focus mode"}
              </button>
              <button
                type="button"
                role="menuitem"
                className="project-actions-item"
                onClick={() => {
                  onExport();
                  setIsMenuOpen(false);
                }}
                disabled={isExportDisabled}
              >
                Export
              </button>
              <button
                type="button"
                role="menuitem"
                className="project-actions-item"
                onClick={() => {
                  importInputRef.current?.click();
                  setIsMenuOpen(false);
                }}
              >
                Import
              </button>
              <button
                type="button"
                role="menuitem"
                className="project-actions-item"
                onClick={() => {
                  setIsFilterOpen((prev) => !prev);
                  setIsMenuOpen(false);
                }}
              >
                {isFilterOpen ? "Hide filters" : "Show filters"}
              </button>
            </div>
          )}
        </div>
        <input
          ref={importInputRef}
          className="sr-only"
          type="file"
          accept=".md,text/markdown"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImport(file);
            }
            event.target.value = "";
          }}
        />
      </div>
      {isFilterOpen && (
        <div className="project-filter-panel">
          <div className="project-filter-header">
            <span className="project-filter-title">Status</span>
          </div>
          <div className="project-filter-options">
            <button
              type="button"
              className={`project-filter-pill project-filter-pill--all${
                isAllSelected ? " is-active" : ""
              }`}
              onClick={onToggleAll}
            >
              All
              <span className="project-filter-count">{totalProjects}</span>
            </button>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={`project-filter-pill project-filter-pill--${
                  STATUS_CLASS_MAP[status]
                }${statusFilters.includes(status) ? " is-active" : ""}`}
                onClick={() => onToggleStatus(status)}
              >
                {status}
                <span className="project-filter-count">
                  {statusCounts[status] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="project-create">
        <textarea
          className="textbox-input project-create-input"
          value={draftName}
          placeholder="New project"
          rows={1}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleCreate();
            }
          }}
          aria-label="New project name"
        />
      </div>
      <ul
        ref={listRef}
        className="project-list"
        onDragOver={(event) => {
          if (!draggingId) {
            return;
          }
          event.preventDefault();

          const closest = getClosestDragTarget(event.clientY);
          if (!closest || closest.id === draggingId) {
            return;
          }

          const reorderKey = `${draggingId}:${closest.id}:${closest.position}`;
          if (lastReorderRef.current === reorderKey) {
            return;
          }
          lastReorderRef.current = reorderKey;
          onReorder(draggingId, closest.id, closest.position);
        }}
        onDrop={(event) => {
          event.preventDefault();
          lastReorderRef.current = null;
        }}
      >
        {sidebarProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const count = projectCounts[project.id] ?? 0;
          const canDelete = totalProjects > 1;
          const isDragging = draggingId === project.id;
          return (
            <li
              key={project.id}
              data-project-id={project.id}
              draggable
              className={`project-item${isActive ? " project-item--active" : ""}${
                isDragging ? " project-item--dragging" : ""
              }${isDragging && !isActive ? " project-item--dragging-inactive" : ""}`}
              onDragStart={(event) => {
                if (shouldIgnoreDragStart(event.target)) {
                  event.preventDefault();
                  return;
                }

                event.dataTransfer.setData("text/plain", project.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(project.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                lastReorderRef.current = null;
              }}
            >
              <div className="project-row">
                <button
                  type="button"
                  className="project-main"
                  onClick={() => onSelect(project.id)}
                >
                  <label
                    className="project-color-swatch project-color-swatch--main"
                    style={{ backgroundColor: project.color }}
                    aria-label={`Project color for ${project.name}`}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <input
                      className="project-color-input"
                      type="color"
                      value={project.color}
                      onChange={(event) =>
                        onColorChange(project.id, event.target.value)
                      }
                    />
                  </label>
                  <span className="project-name">{project.name}</span>
                  <span className="project-count">{count}</span>
                </button>
                <div className="project-meta">
                  <select
                    data-no-drag
                    className={`project-status-select project-status-select--${
                      STATUS_CLASS_MAP[project.status]
                    }`}
                    value={project.status}
                    onChange={(event) =>
                      onStatusChange(
                        project.id,
                        event.target.value as ProjectStatus,
                      )
                    }
                    aria-label={`Status for ${project.name}`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <div className="project-actions">
                    <button
                      type="button"
                      className="project-icon-button project-drag-handle"
                      data-no-drag
                      aria-label="Drag to reorder"
                      title="Drag to reorder"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M11.25 12.75005H4.94999L6.5 14.30005c0.15 0.15215 0.225 0.3361 0.225 0.55175 0 0.2155 -0.07585 0.39825 -0.2275 0.54825 -0.15185 0.15 -0.3352 0.225 -0.55 0.225 -0.215 0 -0.3975 -0.075 -0.5475 -0.225l-2.87501 -2.875c-0.083335 -0.08335 -0.14167 -0.16775 -0.175 -0.25325 -0.033335 -0.08565 -0.05 -0.17735 -0.05 -0.275 0 -0.09785 0.016665 -0.1884 0.05 -0.27175 0.03333 -0.08335 0.091665 -0.16665 0.175 -0.25l2.90001 -2.9c0.1555 -0.15 0.34025 -0.225 0.55425 -0.225 0.2138 0 0.39575 0.075 0.54575 0.225 0.15 0.15 0.225 0.3319 0.225 0.54575 0 0.214 -0.075 0.39875 -0.225 0.55425l-1.57501 1.575H11.25v-6.3l-1.55 1.55c-0.15 0.15 -0.33335 0.225 -0.55 0.225 -0.2167 0 -0.4 -0.075 -0.55 -0.225 -0.15 -0.15 -0.225 -0.3319 -0.225 -0.54575 0 -0.214 0.075 -0.39875 0.225 -0.55425l2.875 -2.875c0.0833 -0.083335 0.16775 -0.14167 0.25325 -0.175 0.08565 -0.033335 0.1773 -0.05 0.275 -0.05 0.0978 0 0.1884 0.016665 0.27175 0.05 0.0833 0.03333 0.16665 0.091665 0.25 0.175l2.875 2.875c0.15 0.15 0.225 0.33335 0.225 0.55 0 0.21665 -0.075 0.4 -0.225 0.55 -0.15 0.15 -0.33195 0.225 -0.54575 0.225 -0.214 0 -0.39875 -0.075 -0.55425 -0.225l-1.55 -1.55v6.3h6.3l-1.55 -1.55c-0.15 -0.15215 -0.225 -0.3361 -0.225 -0.55175 0 -0.2155 0.0758 -0.39825 0.2275 -0.54825 0.1518 -0.15 0.33515 -0.225 0.55 -0.225 0.215 0 0.3975 0.075 0.5475 0.225l2.875 2.875c0.0833 0.08335 0.14165 0.16775 0.175 0.25325 0.0333 0.08565 0.05 0.17735 0.05 0.275 0 0.09785 -0.0167 0.1884 -0.05 0.27175 -0.03335 0.08335 -0.0917 0.16665 -0.175 0.25l-2.875 2.875c-0.15 0.15 -0.33335 0.225 -0.55 0.225 -0.2167 0 -0.4 -0.075 -0.55 -0.225 -0.15 -0.15 -0.225 -0.3319 -0.225 -0.54575 0 -0.214 0.075 -0.39875 0.225 -0.55425l1.55 -1.55H12.75v6.3l1.675 -1.675c0.15215 -0.15 0.33605 -0.225 0.55175 -0.225 0.2155 0 0.39825 0.07585 0.54825 0.2275 0.15 0.15185 0.225 0.33515 0.225 0.55 0 0.215 -0.075 0.3975 -0.225 0.5475l-3 3c-0.08335 0.08335 -0.16775 0.14165 -0.25325 0.175 -0.0857 0.03335 -0.17735 0.05 -0.275 0.05 -0.09785 0 -0.18845 -0.01665 -0.27175 -0.05 -0.08335 -0.03335 -0.1667 -0.09165 -0.25 -0.175l-3 -3c-0.15 -0.15 -0.225 -0.33335 -0.225 -0.55 0 -0.21665 0.075 -0.4 0.225 -0.55 0.15 -0.15 0.3319 -0.225 0.54575 -0.225 0.214 0 0.39875 0.075 0.55425 0.225l1.675 1.675v-6.3Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`delete-button${
                        holdingId === project.id ? " delete-button--active" : ""
                      }`}
                      data-no-drag
                      style={
                        {
                          "--hold-progress":
                            holdingId === project.id ? holdProgress : 0,
                        } as CSSProperties
                      }
                      onPointerDown={(event) =>
                        canDelete && beginHold(event, project.id)
                      }
                      onPointerUp={endHold}
                      onPointerCancel={endHold}
                      aria-label={`Hold to delete ${project.name}`}
                      title={canDelete ? "Hold to delete" : "Cannot delete"}
                      disabled={!canDelete}
                    >
                      <svg
                        className="delete-icon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        fill="none"
                      >
                        <path
                          d="M10 12V17"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 12V17"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 7H20"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 10V18C6 19.6569 7.34315 21 9 21H15C16.6569 21 18 19.6569 18 18V10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default ProjectSidebar;
