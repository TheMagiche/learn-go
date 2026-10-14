export type Filter = "pending" | "all" | "overdue";

const options: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
];

type Props = {
  value: Filter;
  counts: Record<Filter, number>;
  onChange: (value: Filter) => void;
};

export function Filters({ value, counts, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Which tasks to show" className="flex gap-1 rounded-full bg-code p-1">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={
              selected
                ? "rounded-full bg-panel px-3 py-1 text-sm font-semibold text-ink shadow-sm"
                : "rounded-full px-3 py-1 text-sm text-muted hover:text-ink"
            }
          >
            {option.label}
            <span className="ml-1 font-mono text-xs">{counts[option.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
