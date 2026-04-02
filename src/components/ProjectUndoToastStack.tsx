import type { DeletedProject } from "../types";

type ProjectUndoToastStackProps = {
  deletedProjects: DeletedProject[];
  onUndo: (toastId: string) => void;
};

function ProjectUndoToastStack({
  deletedProjects,
  onUndo,
}: ProjectUndoToastStackProps) {
  if (deletedProjects.length === 0) {
    return null;
  }

  return (
    <>
      {deletedProjects.map((entry) => (
        <div key={entry.id} className="undo-toast" role="status">
          <div className="undo-message">
            <span className="undo-dot" aria-hidden="true" />
            <span className="undo-text">
              Removed project "{entry.project.name}"
            </span>
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

export default ProjectUndoToastStack;
