import { useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskStatusOption,
} from "../types";
import useAutoResizeTextarea from "../hooks/useAutoResizeTextarea";

type TaskItemProps = {
  item: Task;
  isEditing: boolean;
  draft: string;
  statusOptions: TaskStatusOption[];
  priorityOptions: TaskPriority[];
  holdingId: string | null;
  holdProgress: number;
  onStartEdit: (item: Task) => void;
  onDraftChange: (value: string) => void;
  onCommitEdit: (item: Task) => void;
  onCancelEdit: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onPriorityChange: (id: string, priority: TaskPriority) => void;
  onBeginHoldDelete: (
    event: PointerEvent<HTMLButtonElement>,
    item: Task,
  ) => void;
  onEndHoldDelete: (event: PointerEvent<HTMLButtonElement>) => void;
};

function TaskItem({
  item,
  isEditing,
  draft,
  statusOptions,
  priorityOptions,
  holdingId,
  holdProgress,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onStatusChange,
  onPriorityChange,
  onBeginHoldDelete,
  onEndHoldDelete,
}: TaskItemProps) {
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeEditTextarea = useAutoResizeTextarea(editTextareaRef, draft, {
    enabled: isEditing,
  });

  return (
    <li className="listbox-item">
      <div className="listbox-main">
        <div
          className={`listbox-text-row${
            isEditing ? " listbox-text-row--editing" : ""
          }`}
        >
          {isEditing ? (
            <textarea
              ref={editTextareaRef}
              className="listbox-textarea"
              value={draft}
              onChange={(event) => {
                onDraftChange(event.target.value);
                resizeEditTextarea();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onCommitEdit(item);
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCommitEdit(item);
                }
              }}
              onBlur={() => onCommitEdit(item)}
              aria-label="Edit task"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="listbox-text-button"
              onClick={() => onStartEdit(item)}
            >
              <span className="listbox-text">{item.text}</span>
            </button>
          )}
        </div>
        <div className="task-toolbar">
          <div className="status-control" role="radiogroup" aria-label="Status">
            {statusOptions.map((status) => {
              const isActive = item.status === status.id;
              const style = {
                "--status-color": status.textColor,
                "--status-bg": status.backgroundColor,
              } as CSSProperties;
              return (
                <label
                  key={status.id}
                  className={`status-option${
                    isActive ? " status-option--active" : ""
                  }`}
                  title={status.label}
                  style={style}
                >
                  <input
                    type="radio"
                    name={`status-${item.id}`}
                    value={status.id}
                    checked={isActive}
                    onChange={() => onStatusChange(item.id, status.id)}
                  />
                  <span className="status-label">{status.label}</span>
                </label>
              );
            })}
          </div>
          <div className="toolbar-actions">
            <select
              id={`priority-${item.id}`}
              className={`priority-select priority-select--${item.priority.toLowerCase()}`}
              value={item.priority}
              onChange={(event) =>
                onPriorityChange(item.id, event.target.value as TaskPriority)
              }
              aria-label="Priority"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`delete-button${
                holdingId === item.id ? " delete-button--active" : ""
              }`}
              style={
                {
                  "--hold-progress": holdingId === item.id ? holdProgress : 0,
                } as CSSProperties
              }
              onPointerDown={(event) => onBeginHoldDelete(event, item)}
              onPointerUp={onEndHoldDelete}
              onPointerCancel={onEndHoldDelete}
              aria-label="Hold to delete"
              title="Hold to delete"
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
}

export default TaskItem;
