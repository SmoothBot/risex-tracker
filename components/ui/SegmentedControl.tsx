"use client";

export type Segment<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-[2px] rounded-md bg-bg p-[3px]">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={[
              "cursor-pointer rounded-[6px] px-3 py-[5px] text-[11px] font-semibold whitespace-nowrap transition-colors",
              active ? "bg-bg-hover text-fg" : "bg-transparent text-fg-muted",
            ].join(" ")}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
