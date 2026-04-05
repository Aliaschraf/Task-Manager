import type { TaskStatus, TaskStatusOption } from "../types";
import type { CSSProperties } from "react";

type FilterBarProps = {
  statusOptions: TaskStatusOption[];
  statusFilters: TaskStatus[];
  isAllSelected: boolean;
  totalCount: number;
  statusCounts: Record<TaskStatus, number>;
  onToggleAll: () => void;
  onToggleStatus: (status: TaskStatus) => void;
};

function FilterBar({
  statusOptions,
  statusFilters,
  isAllSelected,
  totalCount,
  statusCounts,
  onToggleAll,
  onToggleStatus,
}: FilterBarProps) {
  return (
    <div className="filter-row">
      <div className="filter-control" role="group" aria-label="Filter">
        <label
          className={`filter-option${
            isAllSelected ? " filter-option--active" : ""
          }`}
          style={
            {
              "--filter-color": "var(--accent)",
              "--filter-bg": "var(--filter-all-bg)",
            } as CSSProperties
          }
        >
          <input
            type="checkbox"
            name="status-filter-all"
            value="All"
            checked={isAllSelected}
            onChange={onToggleAll}
          />
          <span className="filter-text">All</span>
          <span className="filter-badge">{totalCount}</span>
        </label>
        {statusOptions.map((status) => {
          const isActive = statusFilters.includes(status.id);
          const style = {
            "--filter-color": status.textColor,
            "--filter-bg": status.backgroundColor,
          } as CSSProperties;
          return (
            <label
              key={status.id}
              className={`filter-option${
                isActive ? " filter-option--active" : ""
              }`}
              style={style}
            >
              <input
                type="checkbox"
                name="status-filter"
                value={status.id}
                checked={isActive}
                onChange={() => onToggleStatus(status.id)}
              />
              <span className="filter-text">{status.label}</span>
              <span className="filter-badge">
                {statusCounts[status.id] ?? 0}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default FilterBar;
