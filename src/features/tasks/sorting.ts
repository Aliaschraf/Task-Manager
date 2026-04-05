import type {
  SortDirection,
  SortId,
  Task,
  TaskPriority,
  TaskStatusOption,
} from "../../types";

type TaskComparator = (left: Task, right: Task) => number;

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const compareBy = (
  left: Task,
  right: Task,
  comparators: TaskComparator[],
) => {
  for (const comparator of comparators) {
    const result = comparator(left, right);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
};

export const sortTasks = (
  tasks: Task[],
  sortId: SortId,
  sortDirection: SortDirection,
  statusOptions: TaskStatusOption[],
) => {
  const directionFactor = sortDirection === "asc" ? 1 : -1;
  const statusOrder = new Map(
    statusOptions.map((statusOption, index) => [statusOption.id, index]),
  );

  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      let result = 0;
      switch (sortId) {
        case "flow":
          result = compareBy(a.task, b.task, [
            (left, right) =>
              (statusOrder.get(left.status) ?? 0) -
              (statusOrder.get(right.status) ?? 0),
            (left, right) =>
              PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority],
            (left, right) => right.createdAt - left.createdAt,
          ]);
          break;
        case "priority":
          result =
            directionFactor *
            (PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]);
          break;
        case "created":
          result = directionFactor * (a.task.createdAt - b.task.createdAt);
          break;
        case "title":
          result =
            directionFactor *
            a.task.text.localeCompare(b.task.text, undefined, {
              sensitivity: "base",
            });
          break;
        case "status":
          result =
            directionFactor *
            ((statusOrder.get(a.task.status) ?? 0) -
              (statusOrder.get(b.task.status) ?? 0));
          break;
        default:
          result = 0;
      }

      return result === 0 ? a.index - b.index : result;
    })
    .map((entry) => entry.task);
};
