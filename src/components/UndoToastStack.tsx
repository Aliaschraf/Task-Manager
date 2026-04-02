import type { DeletedTask } from "../types";

type UndoToastStackProps = {
  deletedTasks: DeletedTask[];
  onUndo: (toastId: string) => void;
};

function UndoToastStack({ deletedTasks, onUndo }: UndoToastStackProps) {
  if (deletedTasks.length === 0) {
    return null;
  }

  return (
    <>
      {deletedTasks.map((entry) => (
        <div key={entry.id} className="undo-toast" role="status">
          <div className="undo-message">
            <span className="undo-dot" aria-hidden="true" />
            <span className="undo-text">Removed "{entry.task.text}"</span>
          </div>
          <button
            type="button"
            className="undo-button"
            onClick={() => onUndo(entry.id)}
          >
            Restore
          </button>
        </div>
      ))}
    </>
  );
}

export default UndoToastStack;
