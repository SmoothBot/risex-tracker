"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePerpVolume,
  usePositionsSummary,
  useSegments,
  useVolumeLeaders,
} from "@/lib/api/hooks";
import type { VolumeLeader } from "@/lib/api/schemas";
import { StatGrid, type Stat } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { BiasBar } from "@/components/ui/BiasBar";
import { WalletName } from "@/components/ui/WalletName";
import { FavouriteStar } from "@/components/ui/FavouriteStar";
import { WalletChips } from "./WalletChips";
import { Tag } from "@/components/ui/Tag";
import { QueryBoundary } from "@/components/ui/states";
import { ChevronRight } from "@/components/shell/icons";
import { AddressSearch } from "@/components/shell/AddressSearch";
import { addRecentWallet } from "@/lib/recent-wallets";
import { avatarGradient, baseCoin, cComp, cSg, col } from "@/lib/format";

export function WalletListScreen() {
  const router = useRouter();

  const segments = useSegments();
  const pos = usePositionsSummary();
  const vol = usePerpVolume();
  const leaders = useVolumeLeaders("30d");

  const stats: Stat[] = useMemo(() => {
    const tracked = (segments.data ?? []).reduce(
      (a, s) => a + s.member_count,
      0,
    );
    const equity = pos.data?.total_equity ?? null;
    // perp-volume buckets can come newest-first; sort by time and take the last 24h.
    const vol24 = [...(vol.data ?? [])]
      .sort((a, b) => Date.parse(a.bucket) - Date.parse(b.bucket))
      .slice(-24)
      .reduce((a, p) => a + (p.volume ?? 0), 0);
    return [
      {
        label: "Tracked Wallets",
        value: tracked ? tracked.toLocaleString() : "—",
        sub: pos.data?.accounts_in_profit
          ? `${pos.data.accounts_in_profit.toLocaleString()} in profit`
          : "—",
        subColor: "var(--rx-fg-faint)",
      },
      {
        label: "Combined Equity",
        value: equity != null ? cComp(equity) : "—",
        sub: "perp equity",
        subColor: "var(--rx-fg-faint)",
      },
      {
        label: "24h Volume",
        value: vol24 ? cComp(vol24) : "—",
        sub: "perp, last 24h",
        subColor: "var(--rx-fg-faint)",
      },
    ];
  }, [segments.data, pos.data, vol.data]);

  const columns: Column<VolumeLeader>[] = [
    {
      key: "rank",
      header: "#",
      width: "38px",
      render: (w) => (
        <span className="font-mono text-[12px] text-fg-faint">
          {String(w.rank).padStart(2, "0")}
        </span>
      ),
    },
    {
      key: "wallet",
      header: "WALLET",
      width: "2fr",
      render: (w) => (
        <div className="flex min-w-0 items-center gap-[11px]">
          <FavouriteStar address={w.address} />
          <span
            className="h-[32px] w-[32px] flex-none rounded-[9px]"
            style={{ background: avatarGradient(w.address) }}
          />
          <div className="flex min-w-0 flex-col gap-[3px]">
            <WalletName address={w.address} bracketAddr />
            {w.segment_label ? (
              <span className="text-[10px] font-bold tracking-[0.03em] text-brand-soft-text">
                {w.segment_label}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "eq",
      header: "EQUITY",
      width: "1fr",
      align: "right",
      render: (w) => <span className="font-mono text-[13px]">{cComp(w.equity)}</span>,
    },
    {
      key: "vol",
      header: "30D VOLUME",
      width: "1fr",
      align: "right",
      render: (w) => <span className="font-mono text-[13px]">{cComp(w.volume)}</span>,
    },
    {
      key: "pnl",
      header: "30D PNL",
      width: "1fr",
      align: "right",
      render: (w) => (
        <span className="font-mono text-[13px]" style={{ color: col(w.pnl) }}>
          {cSg(w.pnl)}
        </span>
      ),
    },
    {
      key: "win",
      header: "WIN",
      width: "0.6fr",
      align: "right",
      render: (w) => (
        <span className="pr-3 font-mono text-[12px] text-fg-muted">
          {w.win_rate != null ? `${Math.round(w.win_rate * 100)}%` : "—"}
        </span>
      ),
    },
    {
      key: "bias",
      header: "BIAS",
      width: "1.3fr",
      align: "center",
      headerAlign: "center",
      render: (w) => (
        <div className="pl-4">
          {w.long_pct != null ? (
            <BiasBar longPct={w.long_pct} />
          ) : (
            <span className="font-mono text-[11px] text-fg-faint">—</span>
          )}
        </div>
      ),
    },
    {
      key: "top",
      header: "TOP",
      width: "0.8fr",
      align: "right",
      render: (w) => (
        <span className="text-[12px] font-semibold">
          {w.top_market ? baseCoin(w.top_market) : "—"}
        </span>
      ),
    },
    {
      key: "chev",
      header: "",
      width: "22px",
      align: "right",
      render: () => (
        <span className="flex justify-end text-fg-faint">
          <ChevronRight />
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-[14px] rounded-lg bg-bg-elevated px-6 py-[30px] text-center">
        <span className="font-display text-[24px] font-bold">Track any wallet</span>
        <span className="text-[13px] text-fg-muted">
          Paste a RISEx address to see positions, PnL, exposure and full trade
          history.
        </span>
        <div className="mt-1 flex w-full justify-center">
          <AddressSearch variant="hero" />
        </div>
      </div>

      <StatGrid stats={stats} columns={3} />

      <WalletChips />

      <SectionCard
        title={
          <>
            Hot Wallets{" "}
            <span className="font-medium text-fg-faint">
              · top whales by 30D volume
            </span>
          </>
        }
        right={<span className="text-[11px] text-fg-muted">Updated live</span>}
      >
        <QueryBoundary
          isLoading={leaders.isLoading}
          isError={leaders.isError}
          error={leaders.error}
          isEmpty={(leaders.data ?? []).length === 0}
        >
          <DataTable
            columns={columns}
            rows={leaders.data ?? []}
            rowKey={(w) => w.address}
            onRowClick={(w) => {
              addRecentWallet(w.address);
              router.push(`/wallets/${w.address}`);
            }}
          />
        </QueryBoundary>
      </SectionCard>
    </div>
  );
}
