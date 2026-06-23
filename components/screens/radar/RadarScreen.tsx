"use client";

import { useRouter } from "next/navigation";
import { useRadarActivity, useRadarTrending } from "@/lib/api/hooks";
import { addRecentWallet } from "@/lib/recent-wallets";
import type { RadarEvent, RadarTrending } from "@/lib/api/schemas";
import { Card, SectionCard } from "@/components/ui/Card";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Tag } from "@/components/ui/Tag";
import { WalletName } from "@/components/ui/WalletName";
import { QueryBoundary, ComingSoon } from "@/components/ui/states";
import { baseCoin, cComp, cSg, fmtPrice, shortAddr, timeAgo } from "@/lib/format";

type ActionMeta = { label: string; color: string; bg: string; icon: "up" | "down" | "flat" | "liq" };

function actionMeta(action: string): ActionMeta {
  const a = action.toLowerCase();
  if (a.includes("liquidat"))
    return { label: "Liquidated", color: "var(--rx-warning)", bg: "rgba(240,179,58,.14)", icon: "liq" };
  if (a.includes("short") && a.includes("open"))
    return { label: "Short Opened", color: "var(--rx-down)", bg: "var(--rx-down-soft)", icon: "down" };
  if (a.includes("profit"))
    return { label: "Realized Profit", color: "var(--rx-up)", bg: "var(--rx-up-soft)", icon: "up" };
  if (a.includes("clos"))
    return { label: a.includes("short") ? "Short Closed" : "Position Closed", color: "var(--rx-fg-muted)", bg: "var(--rx-bg-hover)", icon: "flat" };
  if (a.includes("add"))
    return { label: "Long Added", color: "var(--rx-up)", bg: "var(--rx-up-soft)", icon: "up" };
  return { label: "Long Opened", color: "var(--rx-up)", bg: "var(--rx-up-soft)", icon: "up" };
}

function ActionIcon({ kind, color }: { kind: ActionMeta["icon"]; color: string }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "up") return <svg {...common}><path d="M7 17L17 7M9 7h8v8" /></svg>;
  if (kind === "down") return <svg {...common}><path d="M7 7l10 10M9 17h8V9" /></svg>;
  if (kind === "liq") return <svg {...common}><path d="M5 5l14 14M19 5L5 19" /></svg>;
  return <svg {...common}><path d="M5 12h14" /></svg>;
}

function TrendingCard({
  label,
  tag,
  tagTone,
  coin,
  detail,
  value,
  valueColor,
}: {
  label: string;
  tag: string;
  tagTone: "brand" | "down" | "info";
  coin: string;
  detail: string;
  value: string;
  valueColor: string;
}) {
  return (
    <Card padded>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.03em] text-fg-muted">{label}</span>
          <Tag tone={tagTone}>{tag}</Tag>
        </div>
        <div className="flex items-center gap-[10px]">
          <TokenIcon coin={coin} size={30} fontSize={11} />
          <div className="flex flex-col gap-[2px]">
            <span className="text-[15px] font-semibold">{coin}</span>
            <span className="font-mono text-[11px] text-fg-muted">{detail}</span>
          </div>
        </div>
        <span className="font-mono text-[18px] font-medium" style={{ color: valueColor }}>
          {value}
        </span>
      </div>
    </Card>
  );
}

export function RadarScreen() {
  const router = useRouter();
  const trending = useRadarTrending();
  const activity = useRadarActivity();
  const t: RadarTrending | undefined = trending.data;

  return (
    <div className="flex flex-col gap-4">
      <QueryBoundary
        isLoading={trending.isLoading}
        isError={trending.isError}
        error={trending.error}
        isEmpty={!t}
        empty={
          <Card>
            <ComingSoon feature="Trending" endpoint="GET /radar/trending" />
          </Card>
        }
      >
        {t ? (
          <div className="grid grid-cols-4 gap-4">
            <TrendingCard
              label="Most Net Bought"
              tag="24H"
              tagTone="brand"
              coin={baseCoin(t.most_net_bought.market)}
              detail={t.most_net_bought.detail}
              value={cSg(t.most_net_bought.value)}
              valueColor="var(--rx-up)"
            />
            <TrendingCard
              label="Most Net Sold"
              tag="24H"
              tagTone="down"
              coin={baseCoin(t.most_net_sold.market)}
              detail={t.most_net_sold.detail}
              value={cSg(t.most_net_sold.value)}
              valueColor="var(--rx-down)"
            />
            <TrendingCard
              label="Biggest Open"
              tag="WHALE"
              tagTone="brand"
              coin={baseCoin(t.biggest_open.market)}
              detail={`${shortAddr(t.biggest_open.account)} · ${t.biggest_open.leverage ? `${t.biggest_open.leverage}× ` : ""}${t.biggest_open.side === 0 ? "long" : "short"}`}
              value={cComp(t.biggest_open.value)}
              valueColor="var(--rx-fg)"
            />
            <TrendingCard
              label="Most Crowded"
              tag="CROWD"
              tagTone="info"
              coin={baseCoin(t.most_crowded.market)}
              detail={`${Math.round(t.most_crowded.crowd_pct * 100)}% of cohorts long`}
              value={`${Math.round(t.most_crowded.crowd_pct * 100)}%`}
              valueColor="var(--rx-up)"
            />
          </div>
        ) : null}
      </QueryBoundary>

      <SectionCard
        title="Live Activity"
        right={
          <div className="flex items-center gap-[7px]">
            <span
              className="h-[7px] w-[7px] rounded-full bg-brand"
              style={{ animation: "rxpulse 2s infinite" }}
            />
            <span className="text-[11px] text-fg-muted">
              Smart-money feed · streaming
            </span>
          </div>
        }
      >
        <QueryBoundary
          isLoading={activity.isLoading}
          isError={activity.isError}
          error={activity.error}
          isEmpty={(activity.data ?? []).length === 0}
          empty={<ComingSoon feature="Activity feed" endpoint="GET /radar/activity" />}
        >
          <div className="border-t border-border-subtle">
            {(activity.data ?? []).map((e: RadarEvent, i) => {
              const meta = actionMeta(e.action);
              const coin = baseCoin(e.market);
              return (
                <div
                  key={i}
                  role="button"
                  onClick={() => {
                    addRecentWallet(e.account);
                    router.push(`/wallets/${e.account}`);
                  }}
                  className="grid cursor-pointer items-center gap-2 border-b border-border-subtle px-[18px] py-[13px] transition-colors hover:bg-[rgba(255,255,255,0.018)]"
                  style={{ gridTemplateColumns: "64px 1.2fr 1fr 1fr 1fr 96px" }}
                >
                  <span
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-md"
                    style={{ background: meta.bg }}
                  >
                    <ActionIcon kind={meta.icon} color={meta.color} />
                  </span>
                  <div className="flex flex-col gap-[2px]">
                    <span className="text-[13px] font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="flex items-center gap-[5px] text-[11px] text-fg-muted">
                      <TokenIcon coin={coin} size={15} />
                      {coin}
                      {e.leverage ? ` · ${e.leverage}× leverage` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <WalletName address={e.account} size={12} />
                    {e.segment_label ? (
                      <Tag tone="brand" size={9}>
                        {e.segment_label}
                      </Tag>
                    ) : null}
                  </div>
                  <span className="text-right font-mono text-[13px]">
                    {cComp(e.notional)}
                  </span>
                  <span className="text-right font-mono text-[12px] text-fg-muted">
                    @ {fmtPrice(e.price)}
                  </span>
                  <span className="text-right font-mono text-[11px] text-fg-faint">
                    {timeAgo(e.time)}
                  </span>
                </div>
              );
            })}
          </div>
        </QueryBoundary>
      </SectionCard>
    </div>
  );
}
