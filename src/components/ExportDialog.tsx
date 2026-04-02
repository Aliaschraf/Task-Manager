import { useState } from "react";
import type { ReactNode } from "react";

export type ExportFieldId =
  | "projectName"
  | "projectDescription"
  | "projectStatus"
  | "taskStatus"
  | "taskPriority"
  | "taskCreated";

export type ExportFields = Record<ExportFieldId, boolean>;

type ExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onCopy: () => void;
  fields: ExportFields;
  onToggleField: (field: ExportFieldId) => void;
  isExportDisabled: boolean;
  copyStatus: "idle" | "success" | "error";
  previewMarkdown: string;
};

function ExportDialog({
  isOpen,
  onClose,
  onExport,
  onCopy,
  fields,
  onToggleField,
  isExportDisabled,
  copyStatus,
  previewMarkdown,
}: ExportDialogProps) {
  const [previewMode, setPreviewMode] = useState<"plain" | "formatted">(
    "formatted",
  );

  if (!isOpen) {
    return null;
  }

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  const renderFormattedPreview = () => {
    if (!previewMarkdown) {
      return <p className="export-preview-empty">Nothing to preview yet.</p>;
    }

    const lines = previewMarkdown.split("\n");
    const blocks: ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length === 0) {
        return;
      }
      const items = listItems.map((item, index) => (
        <li key={`li-${index}`}>{renderInline(item)}</li>
      ));
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="export-preview-list">
          {items}
        </ul>,
      );
      listItems = [];
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ")) {
        listItems.push(trimmed.slice(2));
        return;
      }

      flushList();

      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith("### ")) {
        blocks.push(
          <h3 key={`h3-${index}`}>{renderInline(trimmed.slice(4))}</h3>,
        );
        return;
      }

      if (trimmed.startsWith("## ")) {
        blocks.push(
          <h2 key={`h2-${index}`}>{renderInline(trimmed.slice(3))}</h2>,
        );
        return;
      }

      if (trimmed.startsWith("# ")) {
        blocks.push(
          <h1 key={`h1-${index}`}>{renderInline(trimmed.slice(2))}</h1>,
        );
        return;
      }

      blocks.push(<p key={`p-${index}`}>{renderInline(trimmed)}</p>);
    });

    flushList();

    return blocks;
  };

  return (
    <div className="export-overlay" role="dialog" aria-modal="true">
      <div className="export-dialog">
        <div className="export-header">
          <div>
            <h3 className="export-title">Export to Markdown</h3>
            <p className="export-subtitle">
              Choose which details to include. Task titles are always exported.
            </p>
          </div>
          <button type="button" className="export-close" onClick={onClose}>
            x
          </button>
        </div>
        <div className="export-section">
          <p className="export-section-title">Project details</p>
          <div className="export-options">
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.projectName}
                onChange={() => onToggleField("projectName")}
              />
              <span>Project name</span>
            </label>
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.projectDescription}
                onChange={() => onToggleField("projectDescription")}
              />
              <span>Description</span>
            </label>
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.projectStatus}
                onChange={() => onToggleField("projectStatus")}
              />
              <span>Status</span>
            </label>
          </div>
        </div>
        <div className="export-section">
          <p className="export-section-title">Task details</p>
          <div className="export-options">
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.taskStatus}
                onChange={() => onToggleField("taskStatus")}
              />
              <span>Status</span>
            </label>
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.taskPriority}
                onChange={() => onToggleField("taskPriority")}
              />
              <span>Priority</span>
            </label>
            <label className="export-option">
              <input
                type="checkbox"
                checked={fields.taskCreated}
                onChange={() => onToggleField("taskCreated")}
              />
              <span>Created date</span>
            </label>
          </div>
        </div>
        <div className="export-section">
          <div className="export-preview-header">
            <p className="export-section-title">Preview</p>
            <div className="export-preview-toggle" role="tablist">
              <button
                type="button"
                className={`export-preview-button${
                  previewMode === "formatted"
                    ? " export-preview-button--active"
                    : ""
                }`}
                onClick={() => setPreviewMode("formatted")}
                role="tab"
                aria-selected={previewMode === "formatted"}
              >
                Formatted
              </button>
              <button
                type="button"
                className={`export-preview-button${
                  previewMode === "plain"
                    ? " export-preview-button--active"
                    : ""
                }`}
                onClick={() => setPreviewMode("plain")}
                role="tab"
                aria-selected={previewMode === "plain"}
              >
                Plain
              </button>
            </div>
          </div>
          {previewMode === "plain" ? (
            <pre className="export-preview">
              {previewMarkdown ? previewMarkdown : "Nothing to preview yet."}
            </pre>
          ) : (
            <div className="export-preview export-preview-formatted">
              {renderFormattedPreview()}
            </div>
          )}
        </div>
        <div className="export-actions">
          <span className="export-status" aria-live="polite">
            {copyStatus === "success" ? "Copied to clipboard." : null}
            {copyStatus === "error" ? "Copy failed." : null}
          </span>
          <button type="button" className="export-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="export-secondary"
            onClick={onCopy}
            disabled={isExportDisabled}
          >
            Copy
          </button>
          <button
            type="button"
            className="export-confirm"
            onClick={onExport}
            disabled={isExportDisabled}
          >
            Download .md
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
