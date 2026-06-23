import type { HeatmapBias } from "@/lib/api/schemas";
import { TokenIcon } from "./TokenIcon";
import { baseCoin } from "@/lib/format";

function cell(b: number): string {
  const a = Math.min(1, Math.abs(b));
  return b >= 0
    ? `rgba(46,211,183,${(0.06 + a * 0.82).toFixed(2)})`
    : `rgba(255,100,103,${(0.06 + a * 0.82).toFixed(2)})`;
}

/** Market × cohort net-long matrix. Ported from the design mockup's heatmap. */
export function HeatmapGrid({ data }: { data: HeatmapBias }) {
  const cols = `118px repeat(${data.segments.length}, minmax(0, 1fr))`;
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: cols }}>
        <div className="px-[6px] py-1 text-[10px] font-semibold text-fg-faint">
          MARKET
        </div>
        {data.segments.map((s) => (
          <div
            key={s.segment_id}
            title={s.label}
            className="overflow-hidden px-[2px] py-1 text-center text-[9px] font-semibold text-ellipsis whitespace-nowrap text-fg-muted"
          >
            C{s.segment_id + 1}
          </div>
        ))}
      </div>
      {data.markets.map((m) => {
        const coin = baseCoin(m.market);
        return (
          <div
            key={m.market_id}
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex items-center gap-[7px] px-[6px]">
              <TokenIcon coin={coin} size={18} fontSize={7} />
              <span className="text-[11px] font-semibold">{coin}</span>
            </div>
            {m.cells.map((c) => {
              const pct = Math.round(c.net_long * 100);
              return (
                <div
                  key={c.segment_id}
                  title={`${coin} · C${c.segment_id + 1}: ${pct}% net ${c.net_long >= 0 ? "long" : "short"}`}
                  className="flex h-[30px] items-center justify-center rounded-[3px] font-mono text-[9.5px] font-semibold"
                  style={{
                    background: cell(c.net_long),
                    color:
                      Math.abs(c.net_long) > 0.55
                        ? "#0C0E12"
                        : "rgba(255,255,255,.82)",
                  }}
                >
                  {(c.net_long >= 0 ? "+" : "") + pct}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
