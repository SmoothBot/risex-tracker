"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addRecentWallet } from "@/lib/recent-wallets";
import { useWalletLabel } from "@/lib/wallet-labels";
import { useSetting } from "@/lib/settings";
import { WalletLabelButton } from "@/components/wallet/WalletLabelButton";
import { SettingsMenu } from "@/components/shell/SettingsMenu";
import { CopyAddress } from "@/components/ui/CopyAddress";
import { FavouriteStar } from "@/components/ui/FavouriteStar";
import { LiveValue } from "@/components/ui/LiveValue";
import { ChartLoadingOverlay } from "@/components/ui/ChartLoadingOverlay";
import { Toggle } from "@/components/ui/Toggle";
import {
  useClosedTrades,
  useEquityHistory,
  useMarketsOi,
  useWalletFills,
  useWalletOverview,
  useWalletPositions,
} from "@/lib/api/hooks";
import type { ClosedTrade, OpenPosition, WalletFill } from "@/lib/api/schemas";
import { Card, SectionCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { AreaChart } from "@/components/ui/AreaChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tag, SideLabel } from "@/components/ui/Tag";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { QueryBoundary, EmptyState, Skeleton } from "@/components/ui/states";
import { ChevronLeft } from "@/components/shell/icons";
import {
  baseCoin,
  cComp,
  cPctRatio,
  cSg,
  cUSD,
  col,
  fmtPrice,
  shortAddr,
  sideLabel,
  timeAgo,
} from "@/lib/format";

type TF = "24h" | "7d" | "30d" | "90d" | "all";
type FillRow = WalletFill & { aggCount?: number };

const DAY = 86_400_000;
// Per-range lookback duration and fetch resolution.
const RANGE: Record<TF, { ms: number; resolution: string }> = {
  "24h": { ms: DAY, resolution: "1m" },
  "7d": { ms: 7 * DAY, resolution: "10m" },
  "30d": { ms: 30 * DAY, resolution: "30m" },
  "90d": { ms: 90 * DAY, resolution: "1h" },
  all: { ms: 0, resolution: "1h" },
};

export function WalletDetailScreen({ address }: { address: string }) {
  const [tf, setTf] = useState<TF>("30d");
  const [metric, setMetric] = useState<"equity" | "pnl">("equity");
  const [detailTab, setDetailTab] = useState<"positions" | "fills" | "closed">(
    "positions",
  );
  const [aggregateFills, setAggregateFills] = useState(false);
  const chartYZero = useSetting("chartYZero");
  const label = useWalletLabel(address);
  useEffect(() => {
    if (/^0x[a-f0-9]{40}$/.test(address)) addRecentWallet(address);
  }, [address]);
  const overview = useWalletOverview(address);
  const equity = useEquityHistory(address, tf, RANGE[tf].resolution);
  const positions = useWalletPositions(address);
  const fills = useWalletFills(address);
  const closed = useClosedTrades(address);
  const markets = useMarketsOi();

  const marketName = useMemo(() => {
    const map = new Map<number, string>();
    (markets.data ?? []).forEach((m) =>
      map.set(m.market_id, m.name ?? `#${m.market_id}`),
    );
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [markets.data]);

  const o = overview.data;

  // Series depend only on the data + selected metric (not tf) so the chart
  // animates on data/metric change, not on the range click itself.
  //   • equity → single area series
  //   • pnl    → uPnL (solid, front) + realized PnL (dotted, behind)
  const { points, secondary } = useMemo(() => {
    const raw = equity.data?.points ?? [];
    const pick = (sel: (p: (typeof raw)[number]) => number | null | undefined) =>
      raw
        .map((p) => ({ t: Date.parse(p.t), v: sel(p) }))
        .filter((p): p is { t: number; v: number } => Number.isFinite(p.v));
    if (metric === "equity") {
      return { points: pick((p) => p.equity), secondary: undefined };
    }
    const pnl = pick((p) => p.pnl);
    // Total PnL (realized + unrealized) is the primary solid line; realized PnL
    // trails behind dotted. Fall back to realized PnL alone if uPnL is absent.
    const hasUpnl = raw.some((p) => Number.isFinite(p.upnl as number));
    const total = hasUpnl
      ? pick(
          (p) =>
            (Number.isFinite(p.pnl) ? (p.pnl as number) : 0) +
            (Number.isFinite(p.upnl) ? (p.upnl as number) : 0),
        )
      : [];
    return total.length > 0
      ? { points: total, secondary: pnl }
      : { points: pnl, secondary: undefined };
  }, [equity.data, metric]);

  const chart = useMemo(() => {
    const dur = RANGE[tf].ms;
    let domainStart: number;
    let domainEnd: number;
    if (dur === 0) {
      // ALL — fit to the data's own span.
      domainStart = points.length ? points[0].t : Date.now() - DAY;
      domainEnd = points.length ? points[points.length - 1].t : Date.now();
      if (domainEnd <= domainStart) domainEnd = domainStart + DAY;
    } else {
      const lastT = points.length ? points[points.length - 1].t : Date.now();
      domainEnd = Math.max(Date.now(), lastT);
      domainStart = domainEnd - dur;
    }
    const spanDays = (domainEnd - domainStart) / DAY;
    const formatTick = (t: number) => {
      const d = new Date(t);
      if (spanDays <= 2)
        return `${("0" + d.getHours()).slice(-2)}:${("0" + d.getMinutes()).slice(-2)}`;
      if (spanDays <= 120)
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    };
    return { domainStart, domainEnd, formatTick };
  }, [points, tf]);

  const allocation = useMemo(() => {
    const list = positions.data ?? [];
    const total = list.reduce((a, p) => a + Math.abs(p.notional), 0) || 1;
    return list
      .map((p) => ({
        coin: baseCoin(p.market ?? marketName(p.market_id ?? 0)),
        pct: (Math.abs(p.notional) / total) * 100,
        side: sideLabel(p.side),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [positions.data, marketName]);

  const longShort = useMemo(() => {
    const list = positions.data ?? [];
    let long = 0;
    let short = 0;
    for (const p of list) {
      const n = Math.abs(p.notional);
      if (p.side === 0) long += n;
      else short += n;
    }
    const total = long + short || 1;
    return { longPct: long / total, shortPct: short / total };
  }, [positions.data]);

  // Fills, optionally aggregated by order_id into one row per order.
  const fillRows = useMemo<FillRow[]>(() => {
    const list = (fills.data ?? []) as FillRow[];
    if (!aggregateFills) return list;
    const byOrder = new Map<number, FillRow & { _notional: number }>();
    for (const f of list) {
      const sz = Math.abs(f.size);
      const g = byOrder.get(f.order_id);
      if (!g) {
        byOrder.set(f.order_id, {
          ...f,
          size: sz,
          fee: f.fee,
          _notional: sz * f.price,
          aggCount: 1,
        });
      } else {
        g.size += sz;
        g.fee += f.fee;
        g._notional += sz * f.price;
        g.aggCount = (g.aggCount ?? 1) + 1;
        if (Date.parse(f.block_timestamp) > Date.parse(g.block_timestamp))
          g.block_timestamp = f.block_timestamp;
      }
    }
    return [...byOrder.values()]
      .map((g) => ({ ...g, price: g.size > 0 ? g._notional / g.size : g.price }))
      .sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp));
  }, [fills.data, aggregateFills]);

  const netUpnl = useMemo(
    () => (positions.data ?? []).reduce((a, p) => a + p.unrealized_pnl, 0),
    [positions.data],
  );

  const posColumns: Column<OpenPosition>[] = [
    {
      key: "market",
      header: "MARKET",
      width: "1.4fr",
      render: (p) => {
        const coin = baseCoin(p.market ?? marketName(p.market_id ?? 0));
        return (
          <div className="flex items-center gap-[9px]">
            <TokenIcon coin={coin} />
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-semibold">{coin}</span>
              <SideLabel up={p.side === 0}>
                {sideLabel(p.side)} {p.leverage.toFixed(0)}×
              </SideLabel>
            </div>
          </div>
        );
      },
    },
    {
      key: "size",
      header: "SIZE",
      width: "1fr",
      align: "right",
      render: (p) => {
        const coin = baseCoin(p.market ?? marketName(p.market_id ?? 0));
        const sz = Math.abs(p.size);
        const szStr = sz >= 1000 ? (sz / 1000).toFixed(1) + "K" : sz.toFixed(sz < 1 ? 4 : 2);
        return (
          <div className="flex flex-col items-end">
            <span className="font-mono text-[13px]">{cComp(Math.abs(p.notional))}</span>
            <span className="font-mono text-[11px] text-fg-faint">
              {szStr} {coin}
            </span>
          </div>
        );
      },
    },
    {
      key: "entry",
      header: "ENTRY",
      width: "1fr",
      align: "right",
      render: (p) => (
        <span className="font-mono text-[13px] text-fg-muted">
          {fmtPrice(p.avg_entry_price)}
        </span>
      ),
    },
    {
      key: "mark",
      header: "MARK",
      width: "1fr",
      align: "right",
      render: (p) => <span className="font-mono text-[13px]">{fmtPrice(p.mark_price)}</span>,
    },
    {
      key: "liq",
      header: "LIQ. PRICE",
      width: "1fr",
      align: "right",
      render: (p) => (
        <span className="font-mono text-[13px] text-warning">
          {fmtPrice(p.liquidation_price)}
        </span>
      ),
    },
    {
      key: "margin",
      header: "MARGIN",
      width: "0.8fr",
      align: "right",
      render: (p) => (
        <span className="font-mono text-[13px] text-fg-muted">
          {p.margin != null ? cComp(p.margin) : "—"}
        </span>
      ),
    },
    {
      key: "upnl",
      header: "uPNL",
      width: "1fr",
      align: "right",
      render: (p) => (
        <span className="font-mono text-[13px]" style={{ color: col(p.unrealized_pnl) }}>
          {cSg(p.unrealized_pnl)}
        </span>
      ),
    },
    {
      key: "roe",
      header: "ROE",
      width: "1fr",
      align: "right",
      render: (p) => (
        <span className="font-mono text-[13px]" style={{ color: col(p.roe ?? 0) }}>
          {p.roe != null ? cPctRatio(p.roe / 100) : "—"}
        </span>
      ),
    },
  ];

  const fillColumns: Column<FillRow>[] = [
    {
      key: "time",
      header: "TIME",
      width: "1fr",
      render: (f) => (
        <span className="font-mono text-[12.5px] text-fg-muted">
          {timeAgo(f.block_timestamp)}
        </span>
      ),
    },
    {
      key: "market",
      header: "MARKET",
      width: "1.2fr",
      render: (f) => {
        const coin = baseCoin(marketName(f.market_id));
        return (
          <div className="flex items-center gap-2">
            {f.aggCount && f.aggCount > 1 ? (
              <span className="rounded-sm bg-bg-hover px-[5px] py-[1px] font-mono text-[10px] text-fg-muted">
                {f.aggCount}×
              </span>
            ) : null}
            <span className="text-[12.5px] font-semibold">{coin}</span>
            <SideLabel up={f.side === 0}>{f.side === 0 ? "BUY" : "SELL"}</SideLabel>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "PRICE",
      width: "1fr",
      align: "right",
      render: (f) => <span className="font-mono text-[12.5px]">{fmtPrice(f.price)}</span>,
    },
    {
      key: "size",
      header: "SIZE",
      width: "1fr",
      align: "right",
      render: (f) => (
        <span className="font-mono text-[12.5px] text-fg-muted">
          {Math.abs(f.size).toFixed(Math.abs(f.size) < 1 ? 2 : 2)}
        </span>
      ),
    },
    {
      key: "value",
      header: "VALUE",
      width: "1fr",
      align: "right",
      render: (f) => (
        <span className="font-mono text-[12.5px]">{cComp(Math.abs(f.size) * f.price)}</span>
      ),
    },
    {
      key: "fee",
      header: "FEE",
      width: "1fr",
      align: "right",
      render: (f) => (
        <span className="font-mono text-[12.5px] text-fg-faint">{cUSD(f.fee, 2)}</span>
      ),
    },
  ];

  const closedColumns: Column<ClosedTrade>[] = [
    {
      key: "closed",
      header: "CLOSED",
      width: "1fr",
      render: (c) => (
        <span className="font-mono text-[12.5px] text-fg-muted">
          {timeAgo(c.close_time)}
        </span>
      ),
    },
    {
      key: "market",
      header: "MARKET",
      width: "1.2fr",
      render: (c) => {
        const coin = baseCoin(c.market ?? marketName(c.market_id));
        return (
          <div className="flex items-center gap-[9px]">
            <TokenIcon coin={coin} size={22} />
            <div className="flex flex-col gap-[2px]">
              <span className="text-[12.5px] font-semibold">{coin}</span>
              <SideLabel up={c.direction === 0}>
                {c.direction === 0 ? "LONG" : "SHORT"}
              </SideLabel>
            </div>
          </div>
        );
      },
    },
    {
      key: "entry",
      header: "ENTRY",
      width: "1fr",
      align: "right",
      render: (c) => (
        <span className="font-mono text-[12.5px] text-fg-muted">{fmtPrice(c.avg_entry_price)}</span>
      ),
    },
    {
      key: "exit",
      header: "EXIT",
      width: "1fr",
      align: "right",
      render: (c) => (
        <span className="font-mono text-[12.5px]">{fmtPrice(c.avg_exit_price)}</span>
      ),
    },
    {
      key: "size",
      header: "SIZE",
      width: "1fr",
      align: "right",
      render: (c) => (
        <span className="font-mono text-[12.5px] text-fg-muted">
          {cComp(Math.abs(c.qty) * c.avg_entry_price)}
        </span>
      ),
    },
    {
      key: "pnl",
      header: "REALIZED PNL",
      width: "1.1fr",
      align: "right",
      render: (c) => {
        const pnl = c.net_pnl ?? c.realized_pnl;
        return (
          <span className="font-mono text-[12.5px]" style={{ color: col(pnl) }}>
            {cSg(pnl)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/wallets"
        className="flex h-[32px] items-center gap-[7px] self-start rounded-md border border-border pr-3 pl-2 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-bg-hover"
      >
        <ChevronLeft />
        All Wallets
      </Link>

      {/* Identity + account value */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(360px,1.1fr) 2fr" }}>
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-[14px]">
              <div
                className="h-[52px] w-[52px] flex-none rounded-[13px]"
                style={{
                  background:
                    "conic-gradient(from 140deg,#03DE82,#017A47,#0C2E22,#03DE82)",
                }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <div className="flex flex-wrap items-center gap-2">
                  {label ? (
                    <span className="flex items-center gap-[6px] truncate text-[16px] font-semibold">
                      <span className="h-[7px] w-[7px] flex-none rounded-full bg-brand" />
                      {label}
                    </span>
                  ) : (
                    <span className="font-mono text-[15px] font-medium whitespace-nowrap">
                      {shortAddr(address)}
                    </span>
                  )}
                  {!label ? <CopyAddress address={address} showText={false} size={13} /> : null}
                  {o?.segment_label ? <Tag tone="brand">{o.segment_label}</Tag> : null}
                </div>
                {label ? <CopyAddress address={address} size={11} /> : null}
                <div className="flex flex-wrap items-center gap-[9px] text-[11px] text-fg-muted">
                  {o?.first_seen ? (
                    <>
                      <span>
                        First seen{" "}
                        {new Date(o.first_seen).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-divider">|</span>
                    </>
                  ) : null}
                  <span>{o ? o.trades_count.toLocaleString() : "—"} trades</span>
                  <span className="text-divider">|</span>
                  <span className="text-brand-soft-text">
                    {o?.win_rate != null ? `${Math.round(o.win_rate * 100)}% win` : "—"}
                  </span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 self-start">
                <FavouriteStar address={address} size={18} />
                <WalletLabelButton address={address} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border-subtle">
              <div className="flex flex-col gap-[3px] bg-bg-elevated px-[13px] py-[11px]">
                <span className="text-[10px] tracking-[0.04em] text-fg-faint">
                  DIRECTION BIAS
                </span>
                <span
                  className="font-mono text-[14px]"
                  style={{ color: o?.direction_bias != null && o.direction_bias >= 0.5 ? "var(--rx-up)" : "var(--rx-down)" }}
                >
                  {o?.direction_bias != null ? `${Math.round(o.direction_bias * 100)}% Long` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-[3px] bg-bg-elevated px-[13px] py-[11px]">
                <span className="text-[10px] tracking-[0.04em] text-fg-faint">
                  AVG LEVERAGE
                </span>
                <span className="font-mono text-[14px]">
                  {o?.avg_leverage != null ? `${o.avg_leverage.toFixed(1)}×` : "—"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          {overview.isError ? (
            <EmptyState title="Account summary unavailable" hint="Couldn’t load this wallet’s summary." />
          ) : !o ? (
            <Skeleton rows={4} />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[6px]">
                  <span className="text-[11px] tracking-[0.04em] text-fg-muted">
                    ACCOUNT VALUE
                  </span>
                  <LiveValue
                    value={o.account_value}
                    className="font-mono text-[40px] leading-none font-medium tracking-[-0.02em]"
                  >
                    {cUSD(o.account_value, 2)}
                  </LiveValue>
                  <div className="mt-[2px] flex items-center gap-2">
                    <LiveValue
                      value={o.unrealized_pnl}
                      className="font-mono text-[14px]"
                      style={{ color: col(o.unrealized_pnl) }}
                    >
                      {cSg(o.unrealized_pnl)}
                    </LiveValue>
                    <span className="text-[12px] text-fg-muted">unrealized</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-fg-faint">PERP EQUITY</span>
                    <span className="font-mono text-[15px]">{cComp(o.perp_equity)}</span>
                  </div>
                  <div className="w-px bg-divider" />
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-fg-faint">SPOT</span>
                    <span className="font-mono text-[15px] text-fg-faint">—</span>
                  </div>
                </div>
              </div>
              <div className="mt-[18px] grid grid-cols-4 gap-px overflow-hidden rounded-md bg-border-subtle">
                {(
                  [
                    { l: "UNREALIZED PNL", v: cSg(o.unrealized_pnl), c: col(o.unrealized_pnl), n: o.unrealized_pnl },
                    { l: "ALL-TIME PNL", v: cSg(o.all_time_pnl), c: col(o.all_time_pnl), n: o.all_time_pnl },
                    { l: "ROI", v: o.roi != null ? cPctRatio(o.roi) : "—", c: col(o.roi ?? 0), n: o.roi },
                    { l: "30D VOLUME", v: cComp(o.volume_30d), c: "var(--rx-fg)", n: null },
                  ] as { l: string; v: string; c: string; n: number | null | undefined }[]
                ).map((m) => (
                  <div key={m.l} className="flex flex-col gap-1 bg-bg-elevated px-[13px] py-3">
                    <span className="text-[10px] text-fg-faint">{m.l}</span>
                    {m.n != null ? (
                      <LiveValue value={m.n} className="font-mono text-[15px]" style={{ color: m.c }}>
                        {m.v}
                      </LiveValue>
                    ) : (
                      <span className="font-mono text-[15px]" style={{ color: m.c }}>
                        {m.v}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Equity chart + exposure */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "2fr minmax(300px,1fr)" }}>
        <SectionCard
          title={metric === "equity" ? "Account Equity" : "Account PnL"}
          subtitle={
            metric === "equity" ? (
              "Perp equity, marked to market"
            ) : (
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-[5px]">
                  <span className="inline-block h-[2px] w-[14px] rounded bg-up" />
                  {secondary ? "PnL + uPnL" : "Realized PnL"}
                </span>
                {secondary ? (
                  <span className="flex items-center gap-[5px]">
                    <span
                      className="inline-block h-0 w-[14px]"
                      style={{ borderTop: "1.5px dashed var(--rx-fg-muted)" }}
                    />
                    Realized PnL
                  </span>
                ) : null}
              </span>
            )
          }
          right={
            <div className="flex items-center gap-2">
              <SegmentedControl<"equity" | "pnl">
                value={metric}
                onChange={setMetric}
                segments={[
                  { value: "equity", label: "Equity" },
                  { value: "pnl", label: "PnL" },
                ]}
              />
              <SegmentedControl<TF>
                value={tf}
                onChange={setTf}
                segments={[
                  { value: "24h", label: "24H" },
                  { value: "7d", label: "7D" },
                  { value: "30d", label: "30D" },
                  { value: "90d", label: "90D" },
                  { value: "all", label: "ALL" },
                ]}
              />
              <SettingsMenu />
            </div>
          }
        >
          <div className="relative px-[18px] pb-3">
            <ChartLoadingOverlay loading={equity.isFetching} />
            <QueryBoundary
              isLoading={equity.isLoading}
              isError={equity.isError}
              error={equity.error}
              isEmpty={points.length === 0}
              empty={<EmptyState title="No equity history" hint="No snapshots for this range yet." />}
            >
              <AreaChart
                points={points}
                secondary={secondary}
                domainStart={chart.domainStart}
                domainEnd={chart.domainEnd}
                formatTick={chart.formatTick}
                zeroLine={metric === "pnl"}
                yFromZero={chartYZero}
                primaryLabel={
                  metric === "equity"
                    ? "Equity"
                    : secondary
                      ? "PnL + uPnL"
                      : "Realized PnL"
                }
                secondaryLabel="Realized PnL"
                transitionKey={metric}
              />
            </QueryBoundary>
          </div>
        </SectionCard>

        <Card>
          <div className="flex flex-col gap-4">
            <span className="text-[14px] font-semibold">Exposure by Asset</span>
            <QueryBoundary
              isLoading={positions.isLoading}
              isError={positions.isError}
              error={positions.error}
              isEmpty={allocation.length === 0}
              empty={<EmptyState title="No open positions" hint="Nothing to break down." />}
            >
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-up">
                    {Math.round(longShort.longPct * 100)}% Long
                  </span>
                  <span className="text-down">
                    {Math.round(longShort.shortPct * 100)}% Short
                  </span>
                </div>
                <div className="flex h-[10px] overflow-hidden rounded-full bg-bg">
                  <div
                    style={{
                      width: `${longShort.longPct * 100}%`,
                      background: "var(--rx-up)",
                    }}
                  />
                  <div
                    style={{
                      width: `${longShort.shortPct * 100}%`,
                      background: "var(--rx-down)",
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-[10px]">
                {allocation.map((a, i) => (
                  <div key={a.coin + i} className="flex items-center gap-[10px]">
                    <span
                      className="h-[8px] w-[8px] flex-none rounded-sm"
                      style={{ background: a.side === "LONG" ? "var(--rx-up)" : "var(--rx-down)" }}
                    />
                    <span className="w-[46px] text-[12px] font-semibold">{a.coin}</span>
                    <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-bg">
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${Math.min(100, a.pct * 1.6)}%`,
                          background: a.side === "LONG" ? "var(--rx-up)" : "var(--rx-down)",
                        }}
                      />
                    </div>
                    <span className="w-[44px] text-right font-mono text-[12px] text-fg-muted">
                      {a.pct.toFixed(1)}%
                    </span>
                    <span className="flex w-[42px] justify-end">
                      <SideLabel up={a.side === "LONG"} size={11}>
                        {a.side}
                      </SideLabel>
                    </span>
                  </div>
                ))}
              </div>
            </QueryBoundary>
          </div>
        </Card>
      </div>

      {/* Positions / Fills — tabbed */}
      <SectionCard
        title={
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDetailTab("positions")}
              className={[
                "text-[14px] font-semibold transition-colors",
                detailTab === "positions" ? "text-fg" : "text-fg-faint hover:text-fg-muted",
              ].join(" ")}
            >
              Open Positions{" "}
              <span className="font-medium text-fg-faint">
                · {positions.data?.length ?? 0}
              </span>
            </button>
            <button
              onClick={() => setDetailTab("closed")}
              className={[
                "text-[14px] font-semibold transition-colors",
                detailTab === "closed" ? "text-fg" : "text-fg-faint hover:text-fg-muted",
              ].join(" ")}
            >
              Closed Trades
            </button>
            <button
              onClick={() => setDetailTab("fills")}
              className={[
                "text-[14px] font-semibold transition-colors",
                detailTab === "fills" ? "text-fg" : "text-fg-faint hover:text-fg-muted",
              ].join(" ")}
            >
              Recent Fills
            </button>
          </div>
        }
        right={
          detailTab === "positions" ? (
            <span className="text-[11px] text-fg-muted">
              Net unrealized{" "}
              <span className="font-mono" style={{ color: col(netUpnl) }}>
                {cSg(netUpnl)}
              </span>
            </span>
          ) : detailTab === "fills" ? (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-fg-muted">
              Aggregate by order
              <Toggle
                checked={aggregateFills}
                onChange={setAggregateFills}
                label="Aggregate fills by order"
              />
            </label>
          ) : null
        }
      >
        {detailTab === "positions" ? (
          <QueryBoundary
            isLoading={positions.isLoading}
            isError={positions.isError}
            error={positions.error}
            isEmpty={(positions.data ?? []).length === 0}
            empty={<EmptyState title="No open positions" hint="This wallet has no open perp positions." />}
          >
            <DataTable
              columns={posColumns}
              rows={positions.data ?? []}
              rowKey={(p, i) => `${p.market_id ?? p.market}-${i}`}
            />
          </QueryBoundary>
        ) : detailTab === "closed" ? (
          <QueryBoundary
            isLoading={closed.isLoading}
            isError={closed.isError}
            error={closed.error}
            isEmpty={(closed.data ?? []).length === 0}
            empty={<EmptyState title="No closed trades" hint="This wallet has no closed round-trip trades." />}
          >
            <DataTable
              columns={closedColumns}
              rows={closed.data ?? []}
              rowKey={(c, i) => `${c.market_id}-${c.close_time}-${i}`}
            />
          </QueryBoundary>
        ) : (
          <QueryBoundary
            isLoading={fills.isLoading}
            isError={fills.isError}
            error={fills.error}
            isEmpty={fillRows.length === 0}
            empty={<EmptyState title="No fills" hint="This wallet has no recent fills." />}
          >
            <DataTable
              columns={fillColumns}
              rows={fillRows}
              rowKey={(f, i) => `${f.order_id}-${f.tx_hash}-${i}`}
            />
          </QueryBoundary>
        )}
      </SectionCard>
    </div>
  );
}
