import type { ReactNode } from "react";

export type Stat = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subColor?: string; // css color
  valueColor?: string;
};

export function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="flex flex-col gap-[6px] bg-bg-elevated px-[18px] py-4">
      <span className="text-[11px] text-fg-muted">{stat.label}</span>
      <span
        className="font-mono text-[21px] font-medium"
        style={stat.valueColor ? { color: stat.valueColor } : undefined}
      >
        {stat.value}
      </span>
      {stat.sub !== undefined ? (
        <span
          className="font-mono text-[11px]"
          style={{ color: stat.subColor || "var(--rx-fg-faint)" }}
        >
          {stat.sub}
        </span>
      ) : null}
    </div>
  );
}

/** Edge-to-edge grid of stat cards separated by 1px dividers. */
export function StatGrid({
  stats,
  columns,
}: {
  stats: Stat[];
  columns?: number;
}) {
  const cols = columns ?? stats.length;
  return (
    <div
      className="grid gap-px overflow-hidden rounded-lg bg-border-subtle"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {stats.map((s, i) => (
        <StatCard key={i} stat={s} />
      ))}
    </div>
  );
}
