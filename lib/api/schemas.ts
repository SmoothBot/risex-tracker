import { z } from "zod";

// Schemas mirror the risex-api response structs (see ../risex-etl/api) and the
// gap contracts in docs/API_GAPS.md. Numeric DB ints come as numbers; nullable
// fields use .nullable(). Timestamps are RFC3339 strings.

// ── Markets ────────────────────────────────────────────────────────────────
export const MarketOi = z.object({
  market_id: z.number(),
  name: z.string().nullable(),
  snapshot_time: z.string(),
  long_oi: z.number(),
  short_oi: z.number(),
  long_oi_notional: z.number(),
  short_oi_notional: z.number(),
  num_longs: z.number(),
  num_shorts: z.number(),
});
export type MarketOi = z.infer<typeof MarketOi>;
export const MarketOiList = z.array(MarketOi);

export const Candle = z.object({
  bucket: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  fill_count: z.number(),
});
export type Candle = z.infer<typeof Candle>;
export const CandleList = z.array(Candle);

export const FundingPoint = z.object({
  bucket: z.string(),
  funding_rate: z.number(),
  accumulated: z.number(),
  index_price: z.number(),
});
export const FundingPointList = z.array(FundingPoint);

// Gap #11 — markets summary (optional perf endpoint).
export const MarketSummary = z.object({
  market_id: z.number(),
  market: z.string(),
  // Illiquid / deprecated markets return null for these.
  mark_price: z.number().nullable(),
  change_24h: z.number().nullable(),
  open_interest: z.number().nullable(),
  funding_1h: z.number().nullable(),
  volume_24h: z.number().nullable(),
  long_pct: z.number().nullable(),
  spark_24h: z.array(z.number()).nullable(),
});
export type MarketSummary = z.infer<typeof MarketSummary>;
export const MarketSummaryList = z.array(MarketSummary);

// Gap #13 — market catalog with token identity (dynamic icons).
export const MarketCatalogEntry = z.object({
  market_id: z.number(),
  name: z.string(),
  base_asset: z.string(),
  quote_asset: z.string(),
  leverage_max: z.number().nullable().optional(),
  token: z
    .object({
      logo_url: z.string().nullable().optional(),
      chain: z.string().nullable().optional(),
      token_address: z.string().nullable().optional(),
      is_native: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type MarketCatalogEntry = z.infer<typeof MarketCatalogEntry>;
export const MarketCatalogList = z.array(MarketCatalogEntry);

// ── Stats ──────────────────────────────────────────────────────────────────
export const PerpVolumePoint = z.object({
  bucket: z.string(),
  volume: z.number().nullable(),
  fees: z.number().nullable(),
  fills: z.number().nullable(),
  unique_accounts_est: z.number().nullable(),
});
export const PerpVolumePointList = z.array(PerpVolumePoint);

export const PositionsSummary = z.object({
  long_oi_notional: z.number().nullable(),
  short_oi_notional: z.number().nullable(),
  num_longs: z.number().nullable(),
  num_shorts: z.number().nullable(),
  accounts_in_profit: z.number().nullable(),
  accounts_total: z.number().nullable(),
  total_equity: z.number().nullable(),
  as_of: z.string().nullable(),
});
export type PositionsSummary = z.infer<typeof PositionsSummary>;

// Gap #8 — liquidation stats.
export const LiquidationStats = z.object({
  window: z.string(),
  total_value: z.number(),
  total_count: z.number(),
  long_value: z.number(),
  short_value: z.number(),
  largest: z
    .object({
      value: z.number(),
      market: z.string(),
      side: z.number(),
      account: z.string(),
    })
    .nullable(),
  at_risk_count: z.number(),
  at_risk_notional: z.number(),
  positions_at_risk: z.array(
    z.object({
      market_id: z.number(),
      market: z.string(),
      distance_pct: z.number(),
      notional: z.number(),
    }),
  ),
});
export type LiquidationStats = z.infer<typeof LiquidationStats>;

// ── Leaderboards ───────────────────────────────────────────────────────────
export const PerpPnlEntry = z.object({
  address: z.string().nullable(),
  account_id: z.number(),
  collateral: z.number().nullable(),
  unrealized_pnl: z.number().nullable(),
  realized_pnl: z.number().nullable(),
  total_pnl: z.number().nullable(),
  equity: z.number().nullable(),
  num_positions: z.number().nullable(),
  snapshot_time: z.string(),
});
export const PerpPnlList = z.array(PerpPnlEntry);

// Gap #4 — volume-ranked enriched leaderboard (Hot Wallets).
export const VolumeLeader = z.object({
  rank: z.number(),
  address: z.string(),
  equity: z.number(),
  volume: z.number(),
  pnl: z.number(),
  win_rate: z.number().nullable(),
  long_pct: z.number().nullable(),
  top_market: z.string().nullable(),
  trades_count: z.number(),
  segment_id: z.number().nullable(),
  segment_label: z.string().nullable(),
});
export type VolumeLeader = z.infer<typeof VolumeLeader>;
export const VolumeLeaderList = z.array(VolumeLeader);

// Gap #12 — wallet search (autocomplete).
export const WalletSearchResult = z.object({
  address: z.string(),
  account_id: z.number().optional(),
  equity: z.number().nullable().optional(),
  segment_id: z.number().nullable().optional(),
  segment_label: z.string().nullable().optional(),
});
export type WalletSearchResult = z.infer<typeof WalletSearchResult>;
export const WalletSearchList = z.array(WalletSearchResult);

// ── Segments / cohorts ─────────────────────────────────────────────────────
export const SegmentInfo = z.object({
  segment_id: z.number(),
  slug: z.string(),
  label: z.string(),
  member_count: z.number(),
});
export type SegmentInfo = z.infer<typeof SegmentInfo>;
export const SegmentInfoList = z.array(SegmentInfo);

// Existing SegmentSummary + gap #5 additive fields (optional until shipped).
export const SegmentSummary = z.object({
  segment_id: z.number(),
  member_count: z.number(),
  total_equity: z.number().nullable(),
  avg_equity: z.number().nullable(),
  total_realized_pnl: z.number().nullable(),
  total_unrealized_pnl: z.number().nullable(),
  total_pnl: z.number().nullable(),
  accounts_in_profit: z.number(),
  // gap #5 (optional)
  net_bias: z.number().optional(),
  pnl_24h: z.number().optional(),
  trend_7d: z.array(z.number()).optional(),
  top_market: z.string().nullable().optional(),
});
export type SegmentSummary = z.infer<typeof SegmentSummary>;

// Gap #6 — cohort × market bias matrix.
export const HeatmapBias = z.object({
  segments: z.array(z.object({ segment_id: z.number(), label: z.string() })),
  markets: z.array(
    z.object({
      market_id: z.number(),
      market: z.string(),
      cells: z.array(
        z.object({
          segment_id: z.number(),
          net_long: z.number(),
          notional: z.number(),
        }),
      ),
    }),
  ),
});
export type HeatmapBias = z.infer<typeof HeatmapBias>;

// ── Positions ──────────────────────────────────────────────────────────────
export const OpenPosition = z.object({
  market_id: z.number().optional(),
  market: z.string().optional(),
  address: z.string().optional(),
  account_id: z.number().optional(),
  side: z.number(),
  size: z.number(),
  avg_entry_price: z.number(),
  mark_price: z.number(),
  notional: z.number(),
  unrealized_pnl: z.number(),
  leverage: z.number(),
  liquidation_price: z.number(),
  margin: z.number().optional(),
  roe: z.number().optional(),
});
export type OpenPosition = z.infer<typeof OpenPosition>;
export const OpenPositionList = z.array(OpenPosition);

export const HeatmapBucket = z.object({
  price_low: z.number(),
  price_high: z.number(),
  long_notional: z.number(),
  short_notional: z.number(),
  position_count: z.number(),
});
export type HeatmapBucket = z.infer<typeof HeatmapBucket>;
export const HeatmapBucketList = z.array(HeatmapBucket);

// ── Liquidations ───────────────────────────────────────────────────────────
export const Liquidation = z.object({
  block_timestamp: z.string(),
  account: z.string(),
  liquidator: z.string(),
  market_id: z.number(),
  order_id: z.number(),
  tx_hash: z.string(),
});
export const LiquidationList = z.array(Liquidation);

// Gap #7 — enriched liquidation fills.
export const LiquidationFill = z.object({
  block_timestamp: z.string(),
  account: z.string(),
  market_id: z.number(),
  market: z.string(),
  side: z.number(),
  price: z.number(),
  size: z.number(),
  value: z.number(),
  tx_hash: z.string(),
});
export type LiquidationFill = z.infer<typeof LiquidationFill>;
export const LiquidationFillList = z.array(LiquidationFill);

// Closed (round-trip) trades.
export const ClosedTrade = z.object({
  market_id: z.number(),
  market: z.string().optional(),
  open_time: z.string(),
  close_time: z.string(),
  direction: z.number(),
  qty: z.number(),
  avg_entry_price: z.number(),
  avg_exit_price: z.number(),
  realized_pnl: z.number(),
  fees: z.number().nullable().optional(),
  fill_count: z.number().nullable().optional(),
  net_pnl: z.number().nullable().optional(),
});
export type ClosedTrade = z.infer<typeof ClosedTrade>;
export const ClosedTradeList = z.array(ClosedTrade);

// ── Wallet ─────────────────────────────────────────────────────────────────
export const WalletFill = z.object({
  block_timestamp: z.string(),
  tx_hash: z.string(),
  market_id: z.number(),
  side: z.number(),
  order_side: z.number(),
  order_id: z.number(),
  size: z.number(),
  price: z.number(),
  fee: z.number(),
  liquidation_fee: z.number(),
  accumulated_funding: z.number(),
  realized_pnl: z.number().nullable(),
  position_before: z.number().nullable(),
  position_after: z.number().nullable(),
  origin: z.string(),
});
export type WalletFill = z.infer<typeof WalletFill>;
export const WalletFillList = z.array(WalletFill);

// Gap #1 — wallet equity history.
export const EquityHistory = z.object({
  address: z.string(),
  interval: z.string(),
  points: z.array(
    z.object({
      t: z.string(),
      equity: z.number(),
      pnl: z.number().nullable().optional(),
      upnl: z.number().nullable().optional(),
    }),
  ),
});
export type EquityHistory = z.infer<typeof EquityHistory>;

// Gap #3 — wallet overview.
export const WalletOverview = z.object({
  address: z.string(),
  first_seen: z.string().nullable(),
  trades_count: z.number(),
  win_rate: z.number().nullable(),
  direction_bias: z.number().nullable(),
  avg_leverage: z.number().nullable(),
  perp_equity: z.number(),
  account_value: z.number(),
  unrealized_pnl: z.number(),
  all_time_pnl: z.number(),
  roi: z.number().nullable(),
  volume_30d: z.number(),
  segment_id: z.number().nullable(),
  segment_label: z.string().nullable(),
});
export type WalletOverview = z.infer<typeof WalletOverview>;

// ── Radar (gap #9 / #10) ───────────────────────────────────────────────────
export const RadarTrending = z.object({
  most_net_bought: z.object({
    market: z.string(),
    value: z.number(),
    detail: z.string(),
  }),
  most_net_sold: z.object({
    market: z.string(),
    value: z.number(),
    detail: z.string(),
  }),
  biggest_open: z.object({
    market: z.string(),
    value: z.number(),
    account: z.string(),
    leverage: z.number().nullable(),
    side: z.number(),
  }),
  most_crowded: z.object({ market: z.string(), crowd_pct: z.number() }),
});
export type RadarTrending = z.infer<typeof RadarTrending>;

export const RadarEvent = z.object({
  time: z.string(),
  action: z.string(),
  market: z.string(),
  side: z.number(),
  leverage: z.number().nullable(),
  notional: z.number(),
  price: z.number(),
  account: z.string(),
  segment_id: z.number().nullable(),
  segment_label: z.string().nullable(),
});
export type RadarEvent = z.infer<typeof RadarEvent>;
export const RadarEventList = z.array(RadarEvent);
