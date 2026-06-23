import type { HeatmapBucket } from "@/lib/api/schemas";
import { cComp } from "@/lib/format";

/**
 * Diverging liquidation map: price levels stacked vertically around the mark.
 * Bars extend right; width ∝ notional-at-risk. Short liqs (above mark) green,
 * long liqs (below mark) red. Ported from the design mockup's liqMap.
 */
export function LiquidationMap({
  buckets,
  mark,
  height = 360,
}: {
  buckets: HeatmapBucket[];
  mark: number;
  height?: number;
}) {
  if (!buckets || buckets.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-fg-faint"
        style={{ height }}
      >
        No liquidation levels.
      </div>
    );
  }

  const w = 760;
  const ht = height;
  const cx = w * 0.46;
  const pl = 66;

  const rows = [...buckets]
    .map((b) => {
      const price = (b.price_low + b.price_high) / 2;
      const amt = b.long_notional + b.short_notional;
      return { price, amt, isShort: price > mark };
    })
    .sort((a, b) => b.price - a.price);

  const maxA = Math.max(...rows.map((r) => r.amt), 1);
  const rowH = (ht - 20) / rows.length;
  // Vertical position of the mark line (interpolated by price rank).
  const markIdx = rows.findIndex((r, i) => r.price <= mark);
  const markY = 10 + (markIdx < 0 ? rows.length : markIdx) * rowH;

  return (
    <svg
      viewBox={`0 0 ${w} ${ht}`}
      width="100%"
      height={ht}
      style={{ display: "block" }}
    >
      <line x1={cx} x2={cx} y1={4} y2={ht - 4} stroke="rgba(255,255,255,0.14)" />
      {rows.map((r, i) => {
        const y = 10 + i * rowH;
        const bw = (r.amt / maxA) * (w - cx - 90);
        const c = r.isShort ? "#03DE82" : "#FB2C36";
        return (
          <g key={i}>
            <text
              x={pl - 8}
              y={y + rowH / 2 + 3}
              textAnchor="end"
              fill="#94979C"
              fontSize={10}
              fontFamily="var(--rx-font-mono)"
            >
              {r.price >= 1000
                ? "$" + (r.price / 1000).toFixed(1) + "K"
                : "$" + r.price.toFixed(2)}
            </text>
            <rect
              x={cx}
              y={y + 2}
              width={Math.max(1, bw)}
              height={rowH - 4}
              rx={2}
              fill={c}
              opacity={0.32 + 0.5 * (r.amt / maxA)}
            />
            <text
              x={cx + bw + 6}
              y={y + rowH / 2 + 3}
              fill="#61656C"
              fontSize={9}
              fontFamily="var(--rx-font-mono)"
            >
              {cComp(r.amt)}
            </text>
          </g>
        );
      })}
      <line
        x1={pl}
        x2={w - 10}
        y1={markY}
        y2={markY}
        stroke="var(--rx-warning)"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      <text
        x={w - 12}
        y={markY - 6}
        textAnchor="end"
        fill="var(--rx-warning)"
        fontSize={9.5}
        fontFamily="var(--rx-font-mono)"
      >
        MARK{" "}
        {mark >= 1000 ? "$" + (mark / 1000).toFixed(1) + "K" : "$" + mark.toFixed(2)}
      </text>
      <text
        x={cx + 6}
        y={16}
        fill="#03DE82"
        fontSize={9.5}
        fontWeight={600}
        fontFamily="var(--rx-font-body)"
      >
        SHORT LIQUIDATIONS ▲
      </text>
      <text
        x={cx + 6}
        y={ht - 6}
        fill="#FB2C36"
        fontSize={9.5}
        fontWeight={600}
        fontFamily="var(--rx-font-body)"
      >
        LONG LIQUIDATIONS ▼
      </text>
    </svg>
  );
}
