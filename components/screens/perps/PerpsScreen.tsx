"use client";

import { useMemo, useState } from "react";
import {
  useMarketsOi,
  useMarketSummary,
  usePerpVolume,
  usePositionsSummary,
} from "@/lib/api/hooks";
import type { MarketOi, MarketSummary } from "@/lib/api/schemas";
import { StatGrid, type Stat } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Sparkline } from "@/components/ui/Sparkline";
import { BiasBar } from "@/components/ui/BiasBar";
import { QueryBoundary } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { baseCoin, cComp, cPctRatio, col, fmtPrice } from "@/lib/format";

type Row = {
  market: string;
  coin: string;
  oiNotional: number;
  longPct: number;
  price?: number | null;
  change24h?: number | null;
  funding?: number | null;
  volume24h?: number | null;
  spark?: number[];
};

type SortKey = "oi" | "vol" | "fund" | "chg";

export function PerpsScreen() {
  const oi = useMarketsOi();
  const summary = useMarketSummary();
  const vol = usePerpVolume();
  const pos = usePositionsSummary();
  const [sort, setSort] = useState<SortKey>("oi");

  const rows = useMemo<Row[]>(() => {
    const list = oi.data ?? [];
    const sumByName = new Map<string, MarketSummary>();
    (summary.data ?? []).forEach((s) => sumByName.set(s.market, s));
    return list.map((m: MarketOi) => {
      const name = m.name ?? `#${m.market_id}`;
      const s = sumByName.get(name);
      const totalOi = m.long_oi_notional + m.short_oi_notional;
      const longPct =
        totalOi > 0
          ? m.long_oi_notional / totalOi
          : m.num_longs / (m.num_longs + m.num_shorts || 1);
      const spark = s?.spark_24h ?? undefined;
      // Upstream change_24h is often null; derive from the 24h spark when needed.
      const change24h =
        s?.change_24h ??
        (spark && spark.length > 1 && spark[0]
          ? (spark[spark.length - 1] - spark[0]) / spark[0]
          : null);
      return {
        market: name,
        coin: baseCoin(name),
        oiNotional: totalOi,
        longPct,
        price: s?.mark_price,
        change24h,
        funding: s?.funding_1h,
        volume24h: s?.volume_24h,
        spark,
      };
    });
  }, [oi.data, summary.data]);

  const sorted = useMemo(() => {
    const key: Record<SortKey, (r: Row) => number> = {
      oi: (r) => r.oiNotional,
      vol: (r) => r.volume24h ?? 0,
      fund: (r) => r.funding ?? 0,
      chg: (r) => r.change24h ?? 0,
    };
    return [...rows].sort((a, b) => key[sort](b) - key[sort](a));
  }, [rows, sort]);

  const stats: Stat[] = useMemo(() => {
    const list = oi.data ?? [];
    const totalOi = list.reduce(
      (a, m) => a + m.long_oi_notional + m.short_oi_notional,
      0,
    );
    const longN = list.reduce((a, m) => a + m.long_oi_notional, 0);
    const shortN = list.reduce((a, m) => a + m.short_oi_notional, 0);
    const skewLong = totalOi > 0 ? Math.round((longN / totalOi) * 100) : 50;
    // perp-volume buckets can come newest-first; sort by time and take the last 24h.
    const vol24 = [...(vol.data ?? [])]
      .sort((a, b) => Date.parse(a.bucket) - Date.parse(b.bucket))
      .slice(-24)
      .reduce((a, p) => a + (p.volume ?? 0), 0);
    const fundings = (summary.data ?? [])
      .map((s) => s.funding_1h)
      .filter((f): f is number => f != null);
    const avgFunding =
      fundings.length > 0
        ? fundings.reduce((a, f) => a + f, 0) / fundings.length
        : null;
    const traders = pos.data?.accounts_total ?? null;
    return [
      {
        label: "Total Open Interest",
        value: cComp(totalOi),
        sub: "across all markets",
      },
      {
        label: "24h Volume",
        value: cComp(vol24),
        sub: "perp, last 24h",
      },
      {
        label: "Avg Funding (1h)",
        value: avgFunding === null ? "—" : cPctRatio(avgFunding),
        sub: avgFunding === null ? "—" : avgFunding >= 0 ? "longs pay shorts" : "shorts pay longs",
        subColor: "var(--rx-fg-faint)",
      },
      {
        label: "Long / Short Skew",
        value: `${skewLong} / ${100 - skewLong}`,
        sub: skewLong >= 50 ? "net long" : "net short",
        subColor: skewLong >= 50 ? "var(--rx-up)" : "var(--rx-down)",
      },
      {
        label: "Active Markets",
        value: String(list.length),
        sub: traders ? `${traders.toLocaleString()} traders` : "—",
        subColor: "var(--rx-fg-faint)",
      },
    ];
  }, [oi.data, vol.data, summary.data, pos.data]);

  const columns: Column<Row>[] = [
    {
      key: "market",
      header: "MARKET",
      width: "1.4fr",
      render: (r) => (
        <div className="flex items-center gap-[9px]">
          <TokenIcon coin={r.coin} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">{r.coin}</span>
            <span className="text-[10px] text-fg-faint">Perp</span>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "MARK PRICE",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="font-mono text-[13px]">
          {r.price != null ? fmtPrice(r.price) : "—"}
        </span>
      ),
    },
    {
      key: "chg",
      header: "24H",
      width: "1.5fr",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-[10px]">
          {r.spark && r.spark.length > 1 ? <Sparkline data={r.spark} /> : null}
          {r.change24h != null ? (
            <span className="w-[56px] text-right font-mono text-[13px]" style={{ color: col(r.change24h) }}>
              {cPctRatio(r.change24h)}
            </span>
          ) : (
            <span className="w-[56px] text-right font-mono text-[13px] text-fg-faint">—</span>
          )}
        </div>
      ),
    },
    {
      key: "oi",
      header: "OPEN INTEREST",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="font-mono text-[13px]">{cComp(r.oiNotional)}</span>
      ),
    },
    {
      key: "fund",
      header: "FUNDING",
      width: "1fr",
      align: "right",
      render: (r) =>
        r.funding != null ? (
          <span className="font-mono text-[13px]" style={{ color: col(r.funding) }}>
            {(r.funding >= 0 ? "+" : "") + (r.funding * 100).toFixed(4) + "%"}
          </span>
        ) : (
          <span className="font-mono text-[13px] text-fg-faint">—</span>
        ),
    },
    {
      key: "vol",
      header: "24H VOL",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="font-mono text-[13px] text-fg-muted">
          {r.volume24h != null ? cComp(r.volume24h) : "—"}
        </span>
      ),
    },
    {
      key: "skew",
      header: "L / S SKEW",
      width: "1.1fr",
      align: "right",
      headerAlign: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <BiasBar longPct={r.longPct} width={70} showPct={false} />
          <span className="w-[34px] text-right font-mono text-[11px] text-up">
            {Math.round(r.longPct * 100)}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatGrid stats={stats} />
      <SectionCard
        title="Perpetual Markets"
        right={
          <SegmentedControl<SortKey>
            value={sort}
            onChange={setSort}
            segments={[
              { value: "oi", label: "Open Interest" },
              { value: "vol", label: "Volume" },
              { value: "fund", label: "Funding" },
              { value: "chg", label: "24h Change" },
            ]}
          />
        }
      >
        <QueryBoundary
          isLoading={oi.isLoading}
          isError={oi.isError}
          error={oi.error}
          isEmpty={(oi.data ?? []).length === 0}
        >
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={(r) => r.market}
          />
        </QueryBoundary>
      </SectionCard>
    </div>
  );
}
