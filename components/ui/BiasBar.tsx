/** Long/short bias bar. `longPct` is 0..1. Red track, green long fill. */
export function BiasBar({
  longPct,
  width,
  showPct = true,
}: {
  longPct: number;
  width?: number;
  showPct?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, longPct));
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-[6px] flex-1 overflow-hidden rounded-[3px] bg-down"
        style={width ? { width } : undefined}
      >
        <div
          className="h-full bg-up"
          style={{ width: `${(pct * 100).toFixed(0)}%` }}
        />
      </div>
      {showPct ? (
        <span className="w-[34px] text-right font-mono text-[10px] text-up">
          {(pct * 100).toFixed(0)}%
        </span>
      ) : null}
    </div>
  );
}
