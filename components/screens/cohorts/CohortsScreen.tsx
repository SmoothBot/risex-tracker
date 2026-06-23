"use client";

import { useMemo } from "react";
import { useSegments, useSegmentSummaries } from "@/lib/api/hooks";
import type { SegmentInfo, SegmentSummary } from "@/lib/api/schemas";
import { StatGrid, type Stat } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Sparkline } from "@/components/ui/Sparkline";
import { QueryBoundary } from "@/components/ui/states";
import { baseCoin, cComp, cSg, col } from "@/lib/format";

type Row = {
  seg: SegmentInfo;
  summary?: SegmentSummary;
};

export function CohortsScreen() {
  const segments = useSegments();
  const ids = (segments.data ?? []).map((s) => s.segment_id);
  const summaries = useSegmentSummaries(ids);

  const rows = useMemo<Row[]>(() => {
    const list = segments.data ?? [];
    // Cohorts presented largest-equity first.
    return list
      .map((seg, i) => ({ seg, summary: summaries[i]?.data as SegmentSummary | undefined }))
      .sort((a, b) => (b.summary?.avg_equity ?? 0) - (a.summary?.avg_equity ?? 0));
  }, [segments.data, summaries]);

  const stats: Stat[] = useMemo(() => {
    const list = segments.data ?? [];
    const totalWallets = list.reduce((a, s) => a + s.member_count, 0);
    const aggEquity = summaries.reduce(
      (a, q) => a + ((q.data as SegmentSummary | undefined)?.total_equity ?? 0),
      0,
    );
    const biasVals = summaries
      .map((q) => (q.data as SegmentSummary | undefined)?.net_bias)
      .filter((v): v is number => v !== undefined);
    const avgBias =
      biasVals.length > 0
        ? biasVals.reduce((a, v) => a + v, 0) / biasVals.length
        : null;
    return [
      {
        label: "Tracked Wallets",
        value: totalWallets.toLocaleString(),
        sub: `across ${list.length} cohorts`,
        subColor: "var(--rx-fg-faint)",
      },
      {
        label: "Aggregate Equity",
        value: aggEquity > 0 ? cComp(aggEquity) : "—",
        sub: "perp equity",
        subColor: "var(--rx-fg-faint)",
      },
      {
        label: "Net Market Bias",
        value: avgBias === null ? "—" : `${Math.round(avgBias * 100)}% Long`,
        sub: avgBias === null ? "—" : avgBias >= 0.5 ? "leaning long" : "leaning short",
        subColor: avgBias !== null && avgBias >= 0.5 ? "var(--rx-up)" : "var(--rx-down)",
      },
    ];
  }, [segments.data, summaries]);

  const columns: Column<Row>[] = [
    {
      key: "cohort",
      header: "COHORT",
      width: "1.6fr",
      render: (r, i) => (
        <div className="flex items-center gap-[11px]">
          <span
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md font-mono text-[11px] font-bold text-fg-on-brand"
            style={{
              background:
                "linear-gradient(135deg,var(--rx-neon-400),var(--rx-neon-600))",
              opacity: 1 - i * 0.06,
            }}
          >
            C{r.seg.segment_id + 1}
          </span>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[13px] font-semibold">{r.seg.label}</span>
            <span className="font-mono text-[10px] text-fg-faint">
              {r.seg.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "wallets",
      header: "WALLETS",
      width: "0.8fr",
      align: "right",
      render: (r) => (
        <span className="font-mono text-[13px]">
          {r.seg.member_count.toLocaleString()}
        </span>
      ),
    },
    {
      key: "avg",
      header: "AVG EQUITY",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="font-mono text-[13px]">
          {r.summary?.avg_equity != null ? cComp(r.summary.avg_equity) : "—"}
        </span>
      ),
    },
    {
      key: "bias",
      header: "NET BIAS",
      width: "1.7fr",
      align: "center",
      render: (r) => {
        const long = r.summary?.net_bias;
        if (long == null)
          return <span className="font-mono text-[11px] text-fg-faint">—</span>;
        const lp = Math.round(long * 100);
        return (
          <div className="flex items-center gap-2 pl-[18px]">
            <span className="w-[32px] font-mono text-[11px] text-down">
              {100 - lp}%
            </span>
            <div className="flex h-[6px] flex-1 overflow-hidden rounded-[3px] bg-down">
              <div className="h-full bg-up" style={{ width: `${lp}%` }} />
            </div>
            <span className="w-[32px] text-right font-mono text-[11px] text-up">
              {lp}%
            </span>
          </div>
        );
      },
    },
    {
      key: "pnl",
      header: "24H PNL",
      width: "1fr",
      align: "right",
      render: (r) =>
        r.summary?.pnl_24h != null ? (
          <span className="font-mono text-[13px]" style={{ color: col(r.summary.pnl_24h) }}>
            {cSg(r.summary.pnl_24h)}
          </span>
        ) : (
          <span className="font-mono text-[13px] text-fg-faint">—</span>
        ),
    },
    {
      key: "trend",
      header: "7D TREND",
      width: "1fr",
      align: "center",
      render: (r) => (
        <div className="flex justify-center">
          {r.summary?.trend_7d ? (
            <Sparkline data={r.summary.trend_7d} width={64} />
          ) : (
            <span className="font-mono text-[11px] text-fg-faint">—</span>
          )}
        </div>
      ),
    },
    {
      key: "top",
      header: "TOP MARKET",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="text-[12px] font-semibold">
          {r.summary?.top_market ? baseCoin(r.summary.top_market) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatGrid stats={stats} columns={3} />
      <SectionCard title="Trader Cohorts" subtitle="Segmented by perp equity">
        <QueryBoundary
          isLoading={segments.isLoading}
          isError={segments.isError}
          error={segments.error}
          isEmpty={(segments.data ?? []).length === 0}
        >
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.seg.slug} />
        </QueryBoundary>
      </SectionCard>
    </div>
  );
}
