"use client";

import { useMemo, useState } from "react";
import {
  useLiquidationFills,
  useLiquidationHeatmap,
  useLiquidationStats,
  useMarketSummary,
  useMarketsOi,
} from "@/lib/api/hooks";
import type { LiquidationFill } from "@/lib/api/schemas";
import { StatGrid, type Stat } from "@/components/ui/StatCard";
import { Card, SectionCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LiquidationMap } from "@/components/ui/LiquidationMap";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { SideLabel } from "@/components/ui/Tag";
import { WalletName } from "@/components/ui/WalletName";
import { QueryBoundary, ComingSoon } from "@/components/ui/states";
import {
  baseCoin,
  cComp,
  fmtPrice,
  shortAddr,
  timeAgo,
} from "@/lib/format";

export function LiquidationsScreen() {
  const stats = useLiquidationStats();
  const fills = useLiquidationFills();
  const markets = useMarketsOi();
  const summary = useMarketSummary();

  const marketList = markets.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Default to the first live market (ids start at 1, not 0).
  const marketId = selectedId ?? marketList[0]?.market_id ?? 1;
  // Use numeric market_id in the path (names contain "/").
  const heatmap = useLiquidationHeatmap(String(marketId), 24);

  const marketName = useMemo(() => {
    const map = new Map<number, string>();
    marketList.forEach((m) => map.set(m.market_id, m.name ?? `#${m.market_id}`));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [marketList]);

  const market = marketName(marketId);

  const mark = useMemo(() => {
    const s = (summary.data ?? []).find((m) => m.market === market);
    if (s?.mark_price != null) return s.mark_price;
    const hb = heatmap.data ?? [];
    if (hb.length) {
      const mid = hb[Math.floor(hb.length / 2)];
      return (mid.price_low + mid.price_high) / 2;
    }
    return 0;
  }, [summary.data, market, heatmap.data]);

  const s = stats.data;
  const statCards: Stat[] = useMemo(() => {
    if (!s)
      return [
        { label: "24h Liquidations", value: "—" },
        { label: "Long Liquidations", value: "—" },
        { label: "Short Liquidations", value: "—" },
        { label: "Largest Single", value: "—" },
        { label: "At Risk (<25%)", value: "—" },
      ];
    const longPct = s.total_value ? Math.round((s.long_value / s.total_value) * 100) : 0;
    return [
      {
        label: "24h Liquidations",
        value: cComp(s.total_value),
        sub: `${s.total_count.toLocaleString()} positions`,
      },
      {
        label: "Long Liquidations",
        value: cComp(s.long_value),
        valueColor: "var(--rx-down)",
        sub: `${longPct}% of total`,
      },
      {
        label: "Short Liquidations",
        value: cComp(s.short_value),
        valueColor: "var(--rx-up)",
        sub: `${100 - longPct}% of total`,
      },
      {
        label: "Largest Single",
        value: s.largest ? cComp(s.largest.value) : "—",
        sub: s.largest
          ? `${baseCoin(s.largest.market)} ${s.largest.side === 0 ? "long" : "short"} · ${shortAddr(s.largest.account)}`
          : "—",
      },
      {
        label: "At Risk (<25%)",
        value: String(s.at_risk_count),
        valueColor: "var(--rx-warning)",
        sub: `${cComp(s.at_risk_notional)} notional`,
      },
    ];
  }, [s]);

  const fillColumns: Column<LiquidationFill>[] = [
    {
      key: "time",
      header: "TIME",
      width: "0.8fr",
      render: (l) => (
        <span className="font-mono text-[12.5px] text-fg-faint">
          {timeAgo(l.block_timestamp)}
        </span>
      ),
    },
    {
      key: "market",
      header: "MARKET",
      width: "1.3fr",
      render: (l) => (
        <div className="flex items-center gap-[9px]">
          <span className="text-[12.5px] font-semibold">{baseCoin(l.market)}</span>
          <SideLabel up={l.side !== 0}>
            {l.side === 0 ? "LONG" : "SHORT"} LIQ
          </SideLabel>
        </div>
      ),
    },
    {
      key: "price",
      header: "PRICE",
      width: "1fr",
      align: "right",
      render: (l) => <span className="font-mono text-[12.5px]">{fmtPrice(l.price)}</span>,
    },
    {
      key: "size",
      header: "SIZE",
      width: "1fr",
      align: "right",
      render: (l) => (
        <span className="font-mono text-[12.5px] text-fg-muted">
          {l.size.toFixed(l.size < 1 ? 2 : 2)}
        </span>
      ),
    },
    {
      key: "value",
      header: "VALUE",
      width: "1fr",
      align: "right",
      render: (l) => (
        <span className="font-mono text-[12.5px]" style={{ color: l.side === 0 ? "var(--rx-down)" : "var(--rx-up)" }}>
          {cComp(l.value)}
        </span>
      ),
    },
    {
      key: "wallet",
      header: "WALLET",
      width: "1fr",
      align: "right",
      render: (l) => (
        <div className="flex justify-end">
          <WalletName address={l.account} size={12.5} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatGrid stats={statCards} />

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <Card>
          <div className="flex flex-col gap-[14px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-[2px]">
                <span className="text-[14px] font-semibold">
                  Liquidation Map · {baseCoin(market)}-PERP
                </span>
                <span className="text-[11px] text-fg-muted">
                  Est. notional liquidated at each price level
                </span>
              </div>
              <select
                value={marketId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="rounded-md border border-border-subtle bg-bg px-2 py-1 font-mono text-[12px] text-fg-muted outline-none"
              >
                {marketList.map((m) => (
                  <option key={m.market_id} value={m.market_id}>
                    {baseCoin(m.name ?? "")}
                  </option>
                ))}
              </select>
            </div>
            <QueryBoundary
              isLoading={heatmap.isLoading}
              isError={heatmap.isError}
              error={heatmap.error}
              isEmpty={(heatmap.data ?? []).length === 0}
              empty={<ComingSoon feature="Liquidation map" endpoint="GET /markets/{market}/liquidation-heatmap" />}
            >
              <LiquidationMap buckets={heatmap.data ?? []} mark={mark} />
            </QueryBoundary>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-[14px]">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[14px] font-semibold">Positions At Risk</span>
              <span className="text-[11px] text-fg-muted">Within 25% of liquidation</span>
            </div>
            <QueryBoundary
              isLoading={stats.isLoading}
              isError={stats.isError}
              error={stats.error}
              isEmpty={!s || s.positions_at_risk.length === 0}
              empty={<ComingSoon feature="Positions at risk" endpoint="GET /stats/liquidations" />}
            >
              <div className="flex flex-col gap-[12px]">
                {(s?.positions_at_risk ?? [])
                  .slice()
                  .sort((a, b) => a.distance_pct - b.distance_pct)
                  .slice(0, 8)
                  .map((r, i) => {
                  const coin = baseCoin(r.market);
                  const dd = Math.round(r.distance_pct * 100);
                  return (
                    <div key={i} className="flex items-center gap-[10px]">
                      <TokenIcon coin={coin} size={24} />
                      <span className="w-[42px] text-[12px] font-semibold">{coin}</span>
                      <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-bg">
                        <div
                          className="h-full rounded-[3px]"
                          style={{
                            width: `${Math.max(4, 100 - dd * 2.6)}%`,
                            background:
                              "linear-gradient(90deg,var(--rx-warning),var(--rx-down))",
                          }}
                        />
                      </div>
                      <span
                        className="w-[46px] text-right font-mono text-[11px]"
                        style={{ color: dd < 10 ? "var(--rx-down)" : "var(--rx-warning)" }}
                      >
                        {dd}%
                      </span>
                      <span className="w-[54px] text-right font-mono text-[11px] text-fg-muted">
                        {cComp(r.notional)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </QueryBoundary>
          </div>
        </Card>
      </div>

      <SectionCard title="Recent Liquidations">
        <QueryBoundary
          isLoading={fills.isLoading}
          isError={fills.isError}
          error={fills.error}
          isEmpty={(fills.data ?? []).length === 0}
          empty={<ComingSoon feature="Liquidation feed" endpoint="GET /liquidations/fills" />}
        >
          <DataTable
            columns={fillColumns}
            rows={fills.data ?? []}
            rowKey={(l, i) => `${l.tx_hash}-${i}`}
          />
        </QueryBoundary>
      </SectionCard>
    </div>
  );
}
