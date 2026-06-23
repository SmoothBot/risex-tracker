"use client";

import { useQuery, useQueries, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { apiGet, type QueryParams } from "./client";
import { POLL } from "../query";
import * as S from "./schemas";

// Generic query helper bound to a schema.
function useApi<T>(
  key: unknown[],
  path: string,
  schema: z.ZodType<T>,
  params?: QueryParams,
  opts?: { refetchInterval?: number; enabled?: boolean; keepPrevious?: boolean },
) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet(path, schema, params),
    refetchInterval: opts?.refetchInterval,
    enabled: opts?.enabled,
    // Keep showing the previous range's data while a new one loads, so the chart
    // stays mounted (no skeleton flash) and can animate between ranges.
    placeholderData: opts?.keepPrevious ? keepPreviousData : undefined,
  });
}

// ── Markets / perps ──────────────────────────────────────────────────────────
// Market catalog (gap #13) — token identity for icons + metadata. Cached long.
export const useMarkets = () =>
  useApi(["markets-catalog"], "markets", S.MarketCatalogList, undefined, {
    enabled: true,
  });

export const useMarketsOi = () =>
  useApi(["markets-oi"], "markets/open-interest", S.MarketOiList, undefined, {
    refetchInterval: POLL.base,
  });

export const useMarketSummary = () =>
  useApi(["markets-summary"], "markets/summary", S.MarketSummaryList, undefined, {
    refetchInterval: POLL.base,
  });

export const useCandles = (market: string, interval: "1m" | "1h" | "1d") =>
  useApi(
    ["candles", market, interval],
    `markets/${encodeURIComponent(market)}/candles`,
    S.CandleList,
    { interval, limit: 48 },
    { enabled: !!market },
  );

export const useFunding = (market: string) =>
  useApi(
    ["funding", market],
    `markets/${encodeURIComponent(market)}/funding`,
    S.FundingPointList,
    { limit: 168 },
    { enabled: !!market },
  );

export const usePerpVolume = () =>
  useApi(["perp-volume"], "stats/perp-volume", S.PerpVolumePointList, {
    limit: 48,
  });

export const usePositionsSummary = () =>
  useApi(["positions-summary"], "stats/positions", S.PositionsSummary, undefined, {
    refetchInterval: POLL.base,
  });

// ── Leaderboards / wallets list ──────────────────────────────────────────────
export const usePerpPnl = (limit = 50) =>
  useApi(["perp-pnl", limit], "leaderboards/perp-pnl", S.PerpPnlList, { limit });

// Gap #12 — wallet search (needs ≥2 hex chars). Enabled only for valid queries.
export const useWalletSearch = (q: string) => {
  const hex = q.trim().toLowerCase().replace(/^0x/, "");
  const valid = /^[0-9a-f]{2,}$/.test(hex);
  return useApi(
    ["wallet-search", hex],
    "wallets/search",
    S.WalletSearchList,
    { q: hex, limit: 8 },
    { enabled: valid },
  );
};

export const useVolumeLeaders = (window: "24h" | "7d" | "30d" = "30d") =>
  useApi(["volume-leaders", window], "leaderboards/volume", S.VolumeLeaderList, {
    window,
    limit: 25,
  });

// ── Segments / cohorts ───────────────────────────────────────────────────────
export const useSegments = () =>
  useApi(["segments"], "segments", S.SegmentInfoList);

export const useSegmentSummary = (id: number, enabled = true) =>
  useApi(
    ["segment-summary", id],
    `segments/${id}/summary`,
    S.SegmentSummary,
    undefined,
    { enabled },
  );

export const useHeatmapBias = () =>
  useApi(["heatmap-bias"], "markets/heatmap/bias", S.HeatmapBias);

// Parallel per-segment summaries (gap #5 fields are optional on the schema).
export function useSegmentSummaries(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["segment-summary", id],
      queryFn: () =>
        apiGet(`segments/${id}/summary`, S.SegmentSummary, { env: undefined }),
    })),
  });
}

// ── Positions / liquidations ─────────────────────────────────────────────────
export const useMarketOpenPositions = (market: string) =>
  useApi(
    ["market-positions", market],
    `markets/${encodeURIComponent(market)}/positions/open`,
    S.OpenPositionList,
    { limit: 100 },
    { enabled: !!market },
  );

export const useLiquidationHeatmap = (market: string, buckets = 24) =>
  useApi(
    ["liq-heatmap", market, buckets],
    `markets/${encodeURIComponent(market)}/liquidation-heatmap`,
    S.HeatmapBucketList,
    { buckets },
    { enabled: !!market },
  );

export const useLiquidations = () =>
  useApi(["liquidations"], "liquidations", S.LiquidationList, { limit: 25 }, {
    refetchInterval: POLL.fast,
  });

export const useLiquidationFills = () =>
  useApi(["liquidation-fills"], "liquidations/fills", S.LiquidationFillList, {
    limit: 25,
  }, { refetchInterval: POLL.fast });

export const useLiquidationStats = () =>
  useApi(["liquidation-stats"], "stats/liquidations", S.LiquidationStats, {
    window: "24h",
  }, { refetchInterval: POLL.base });

// ── Wallet detail ────────────────────────────────────────────────────────────
export const useWalletFills = (address: string) =>
  useApi(
    ["wallet-fills", address],
    `wallets/${address}/fills`,
    S.WalletFillList,
    { limit: 25 },
    { enabled: !!address },
  );

export const useWalletPositions = (address: string) =>
  useApi(
    ["wallet-positions", address],
    `wallets/${address}/positions/open`,
    S.OpenPositionList,
    undefined,
    { enabled: !!address, refetchInterval: POLL.realtime },
  );

export const useEquityHistory = (
  address: string,
  interval: "24h" | "7d" | "30d" | "90d" | "all",
  resolution: string,
) =>
  useApi(
    ["equity-history", address, interval, resolution],
    `wallets/${address}/equity-history`,
    S.EquityHistory,
    { interval, resolution },
    { enabled: !!address, keepPrevious: true },
  );

export const useWalletOverview = (address: string) =>
  useApi(
    ["wallet-overview", address],
    `wallets/${address}/overview`,
    S.WalletOverview,
    undefined,
    { enabled: !!address, refetchInterval: POLL.realtime },
  );

// Closed (round-trip) trades with realized PnL.
export const useClosedTrades = (address: string) =>
  useApi(
    ["closed-trades", address],
    `wallets/${address}/closed-trades`,
    S.ClosedTradeList,
    { limit: 25 },
    { enabled: !!address },
  );

// ── Radar ────────────────────────────────────────────────────────────────────
export const useRadarTrending = () =>
  useApi(["radar-trending"], "radar/trending", S.RadarTrending, undefined, {
    refetchInterval: POLL.base,
  });

// min_notional defaults to $50k upstream, which can be days-stale on lower-volume
// environments; use a smaller floor so the feed reflects current activity.
export const useRadarActivity = () =>
  useApi(
    ["radar-activity"],
    "radar/activity",
    S.RadarEventList,
    { limit: 20, min_notional: 1000 },
    { refetchInterval: POLL.fast },
  );
