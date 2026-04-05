import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from "../../constants";
import type { ExportFields } from "../../components/ExportDialog";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TaskStatusOption,
} from "../../types";

type ParsedTask = {
  text: string;
  statusLabel: string;
  priority: TaskPriority;
  createdAt: number;
};

export type ParsedMarkdownProject = {
  projectName: string;
  projectStatus: ProjectStatus | null;
  description: string;
  tasks: ParsedTask[];
};

const formatCreatedDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const parseImportedMarkdown = (content: string): ParsedMarkdownProject => {
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
    for (let index = descriptionIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim().startsWith("## ") || line.trim().startsWith("# ")) {
        break;
      }
      descriptionLines.push(line);
    }
    description = descriptionLines.join("\n").trim();
  }

  const tasks: ParsedTask[] = [];
  const tasksIndex = lines.findIndex((line) => line.trim() === "## Tasks");
  if (tasksIndex !== -1) {
    for (let index = tasksIndex + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line.startsWith("- ")) {
        continue;
      }

      const listText = line.slice(2).trim();
      if (!listText) {
        continue;
      }

      const match = listText.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
      const text = match?.[1]?.trim() ?? listText;
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
          const matchingPriority = PRIORITY_OPTIONS.find(
            (option) => option.toLowerCase() === raw.toLowerCase(),
          );
          if (matchingPriority) {
            priority = matchingPriority;
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

type BuildProjectMarkdownParams = {
  activeProject: Project | undefined;
  sortedItems: Task[];
  statusOptionMap: Map<TaskStatus, TaskStatusOption>;
  exportFields: ExportFields;
};

export const buildProjectMarkdown = ({
  activeProject,
  sortedItems,
  statusOptionMap,
  exportFields,
}: BuildProjectMarkdownParams) => {
  if (!activeProject) {
    return "";
  }

  const lines: string[] = [];
  const heading = exportFields.projectName ? activeProject.name : "Task Export";
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

export const buildMarkdownFilename = (
  projectName: string | undefined,
  includeProjectName: boolean,
) => {
  const baseName = includeProjectName ? (projectName ?? "tasks") : "tasks";
  const normalized = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${normalized || "tasks"}-${dateStamp}.md`;
};
