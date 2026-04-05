import { useState } from "react";
import TaskItem from "./TaskItem";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskStatusOption,
} from "../types";
import { HOLD_DURATION_MS } from "../constants";
import useHoldToDelete from "../hooks/useHoldToDelete";

type ListBoxProps = {
  items: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onPriorityChange: (id: string, priority: TaskPriority) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  priorityOptions: TaskPriority[];
  statusOptions: TaskStatusOption[];
};

function ListBox({
  items,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onEdit,
  priorityOptions,
  statusOptions,
}: ListBoxProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { holdingId, holdProgress, beginHold, endHold } =
    useHoldToDelete<HTMLButtonElement>({
      holdDurationMs: HOLD_DURATION_MS,
      onComplete: onDelete,
    });
  const startEdit = (item: Task) => {
    setEditingId(item.id);
    setDraft(item.text);
  };

  const exitEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const commitEdit = (item: Task) => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onDelete(item.id);
      exitEdit();
      return;
    }

    if (trimmed !== item.text) {
      onEdit(item.id, trimmed);
    }

    exitEdit();
  };

  return (
    <ul className="listbox">
      {items.length === 0 ? (
        <li className="listbox-empty">No tasks yet. Add one above.</li>
      ) : null}
      {items.map((item) => (
        <TaskItem
          key={item.id}
          item={item}
          isEditing={editingId === item.id}
          draft={draft}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          holdingId={holdingId}
          holdProgress={holdProgress}
          onStartEdit={startEdit}
          onDraftChange={setDraft}
          onCommitEdit={commitEdit}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onBeginHoldDelete={(event, task) => beginHold(event, task.id)}
          onEndHoldDelete={endHold}
        />
      ))}
    </ul>
  );
}

export default ListBox;
