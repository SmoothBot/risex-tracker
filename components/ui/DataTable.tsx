import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** grid fraction or width, e.g. "1fr", "1.4fr", "60px" */
  width: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
  /** header alignment override (defaults to align) */
  headerAlign?: "left" | "right" | "center";
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className = "",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}) {
  const template = columns.map((c) => c.width).join(" ");
  return (
    <div className={className}>
      <div
        className="grid border-b border-border-subtle px-[18px] pb-2 text-[10px] tracking-[0.05em] text-fg-faint"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((c) => (
          <span
            key={c.key}
            className={alignClass[c.headerAlign ?? c.align ?? "left"]}
          >
            {c.header}
          </span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={rowKey(row, i)}
          onClick={onRowClick ? () => onRowClick(row, i) : undefined}
          className={[
            "grid items-center border-b border-border-subtle px-[18px] py-3 transition-colors hover:bg-[rgba(255,255,255,0.018)]",
            onRowClick ? "cursor-pointer" : "",
          ].join(" ")}
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <div
              key={c.key}
              className={alignClass[c.align ?? "left"]}
              style={{ minWidth: 0 }}
            >
              {c.render(row, i)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
