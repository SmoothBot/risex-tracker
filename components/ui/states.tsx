import type { ReactNode } from "react";

export function EmptyState({
  title = "No data yet",
  hint,
  icon,
}: {
  title?: string;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon ? <div className="text-fg-faint">{icon}</div> : null}
      <span className="text-[13px] font-semibold text-fg-muted">{title}</span>
      {hint ? (
        <span className="max-w-[420px] text-[11px] text-fg-faint">{hint}</span>
      ) : null}
    </div>
  );
}

/** Used where a feature depends on an API gap endpoint not yet shipped. */
export function ComingSoon({ feature, endpoint }: { feature: string; endpoint?: string }) {
  return (
    <EmptyState
      title={`${feature} — coming soon`}
      hint={
        endpoint ? (
          <>
            Awaiting API endpoint{" "}
            <code className="font-mono text-fg-muted">{endpoint}</code>. See
            docs/API_GAPS.md.
          </>
        ) : (
          "Awaiting backing API endpoint. See docs/API_GAPS.md."
        )
      }
    />
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="text-[13px] font-semibold text-down">
        Couldn’t load data
      </span>
      {message ? (
        <span className="max-w-[420px] font-mono text-[11px] text-fg-faint">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function Skeleton({
  className = "",
  rows = 6,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={["flex flex-col gap-2 p-[18px]", className].join(" ")}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[34px] animate-pulse rounded-md bg-bg-hover"
          style={{ opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
}

/**
 * Wraps a data-backed section: shows skeleton / error / empty / content based on
 * query state. `isEmpty` lets callers decide what "empty" means.
 */
export function QueryBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  empty,
  skeletonRows,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  empty?: ReactNode;
  skeletonRows?: number;
  children: ReactNode;
}) {
  if (isLoading) return <Skeleton rows={skeletonRows} />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  if (isEmpty) return <>{empty ?? <EmptyState />}</>;
  return <>{children}</>;
}
