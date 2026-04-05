import {
  DEFAULT_TASK_STATUS_OPTIONS,
  STATUS_COLOR_POOL,
} from "../../constants";
import type { TaskStatusOption } from "../../types";

export const cloneDefaultStatusOptions = () =>
  DEFAULT_TASK_STATUS_OPTIONS.map((option) => ({ ...option }));

export const getDefaultStatusId = (options: TaskStatusOption[]) =>
  options.find((status) => status.label.toLowerCase() === "todo")?.id ??
  options[0]?.id ??
  "todo";

export const findStatusByLabel = (
  options: TaskStatusOption[],
  label: string,
) =>
  options.find(
    (status) => status.label.toLowerCase() === label.toLowerCase(),
  );

const buildStatusId = (label: string, existing: TaskStatusOption[]): string => {
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
  const matchingDefault = DEFAULT_TASK_STATUS_OPTIONS.find(
    (option) => option.label.toLowerCase() === label.toLowerCase(),
  );

  if (matchingDefault) {
    return {
      textColor: matchingDefault.textColor,
      backgroundColor: matchingDefault.backgroundColor,
    };
  }

  return pickRandomStatusColors(existing);
};

export const createStatusOption = (
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

export const normalizeStatusOptions = (options: TaskStatusOption[]) => {
  const normalizedOptions: TaskStatusOption[] = [];
  const seenIds = new Set<string>();

  options.forEach((option) => {
    const trimmedLabel = option.label.trim();
    if (!trimmedLabel) {
      return;
    }

    if (seenIds.has(option.id)) {
      return;
    }

    seenIds.add(option.id);
    normalizedOptions.push({ ...option, label: trimmedLabel });
  });

  return normalizedOptions.length
    ? normalizedOptions
    : cloneDefaultStatusOptions();
};

export const mergeStatusOptions = (
  base: TaskStatusOption[],
  incoming: string[],
) => {
  const merged = [...base.map((option) => ({ ...option }))];

  incoming.forEach((label) => {
    if (!label.trim()) {
      return;
    }

    if (findStatusByLabel(merged, label)) {
      return;
    }

    merged.push(createStatusOption(label, merged));
  });

  return normalizeStatusOptions(merged);
};
