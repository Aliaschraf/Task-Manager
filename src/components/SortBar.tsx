import type { SortDirection, SortId, SortOption } from "../types";

type SortBarProps = {
  sortOptions: SortOption[];
  sortId: SortId;
  sortDirection: SortDirection;
  activeSort: SortOption;
  onSortChange: (id: SortId) => void;
  onToggleDirection: () => void;
};

function SortBar({
  sortOptions,
  sortId,
  sortDirection,
  activeSort,
  onSortChange,
  onToggleDirection,
}: SortBarProps) {
  return (
    <div className="sort-row">
      <div className="sort-heading">
        <span className="filter-label">Sort</span>
        <span className="sort-hint">{activeSort.hint}</span>
      </div>
      <div className="sort-controls">
        <div className="sort-options" role="radiogroup" aria-label="Sort">
          {sortOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`sort-option${
                option.id === sortId ? " sort-option--active" : ""
              }`}
              role="radio"
              aria-checked={option.id === sortId}
              onClick={() => onSortChange(option.id)}
            >
              <span className="sort-option-label">{option.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`sort-direction${
            activeSort.supportsDirection ? "" : " sort-direction--locked"
          }`}
          onClick={onToggleDirection}
          disabled={!activeSort.supportsDirection}
        >
          <span className="sort-direction-text">
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default SortBar;
