import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg bg-bg-elevated",
        padded ? "p-[18px]" : "overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Card with a header row (title + optional right-side actions). */
export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["overflow-hidden rounded-lg bg-bg-elevated", className].join(" ")}>
      <div className="flex items-center justify-between px-[18px] pt-4 pb-3">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[14px] font-semibold">{title}</span>
          {subtitle ? (
            <span className="text-[11px] text-fg-muted">{subtitle}</span>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
