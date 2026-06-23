"use client";

import { useHeatmapBias } from "@/lib/api/hooks";
import { Card } from "@/components/ui/Card";
import { HeatmapGrid } from "@/components/ui/HeatmapGrid";
import { QueryBoundary, ComingSoon } from "@/components/ui/states";

export function HeatmapScreen() {
  const bias = useHeatmapBias();
  // Drop deprecated markets from the matrix.
  const data = bias.data
    ? {
        ...bias.data,
        markets: bias.data.markets.filter((m) => !/deprecated/i.test(m.market)),
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-[3px]">
              <span className="text-[14px] font-semibold">Position Heat Map</span>
              <span className="text-[11px] text-fg-muted">
                Net directional bias of each cohort per market. Cell value = % net
                long.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-fg-muted">Short</span>
              <span
                className="h-[8px] w-[120px] rounded-[4px]"
                style={{
                  background:
                    "linear-gradient(90deg,#FB2C36,#3a2125,#22262F,#16332a,#03DE82)",
                }}
              />
              <span className="text-[11px] text-fg-muted">Long</span>
            </div>
          </div>
          <QueryBoundary
            isLoading={bias.isLoading}
            isError={bias.isError}
            error={bias.error}
            isEmpty={!data || data.markets.length === 0}
            empty={
              <ComingSoon
                feature="Position heat map"
                endpoint="GET /markets/heatmap/bias"
              />
            }
          >
            {data ? <HeatmapGrid data={data} /> : null}
          </QueryBoundary>
        </div>
      </Card>
    </div>
  );
}
