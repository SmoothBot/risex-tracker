# RISEx Tracker — API Gap Endpoints (contracts for the ETL/API team)

This document specifies the **new or extended endpoints** the RISEx Tracker
dashboard needs but the current `risex-api` does not yet serve. The frontend is
built against these contracts and renders graceful empty states until they ship.

It complements `../risex-etl/api/API_DESIGN.md` (the parity analysis). The gap
IDs (**G1–G8**) referenced below are from that document.

## Conventions (match the existing API)

- Base path: `/api/v1/`. Auth: `Authorization: Bearer <key>` (the dashboard
  reaches these through a server-side proxy; keys never hit the browser).
- `?env=` selects environment (default `mainnet`).
- Pagination: `?limit=` (default 100, max 1000), `?offset=`.
- Time window: `?from=` / `?to=` as **unix seconds**.
- `{market}` accepts a numeric `market_id` or a name (e.g. `BTC/USDC`).
- `{address}` is `0x`-hex.
- All sizes / prices / PnL / notional in **human units** (USD / coins), not raw
  contract integers.
- `side` / `direction`: `0 = long`, `1 = short` (matches `OpenPosition`,
  `ClosedTrade`).
- Timestamps: RFC 3339 / ISO-8601 UTC strings (matches `DateTime<Utc>`).
- All endpoints are **read-only `GET`**.

Field types use TypeScript-ish notation (`number`, `string`, `number | null`).

---

## Priority 1 — Wallet detail (highest user value)

### 1. Wallet equity history — `GET /api/v1/wallets/{address}/equity-history`
Powers the **Account Equity** chart (24H/7D/30D/90D/ALL toggle).

**Query:** `interval=24h|7d|30d|90d|all` (required), `env`.
Bucketing guidance: `24h`→ ~5–30 min points, `7d`→ hourly, `30d/90d`→ daily,
`all`→ daily. Server picks sensible resolution per interval.

**Response:** `200`
```json
{
  "address": "0xfea8…4fd8",
  "interval": "30d",
  "points": [
    { "t": "2026-05-22T00:00:00Z", "equity": 248120.55, "pnl": 0.0 }
  ]
}
```
| field | type | notes |
|---|---|---|
| `points[].t` | string | bucket timestamp (UTC) |
| `points[].equity` | number | perp equity at bucket, USD (marked-to-market) |
| `points[].pnl` | number \| null | cumulative PnL vs window start, optional |

**Source:** `account_equity_snapshots` (1/min) filtered by account, downsampled
per interval. **Gap:** no per-wallet equity time-series endpoint exists today
(leaderboard returns only the latest snapshot).

---

### 2. Wallet open positions — `GET /api/v1/wallets/{address}/positions/open`
Powers **Open Positions** table + **Exposure by Asset** on wallet detail.

**Query:** `env`, `limit`, `offset`.

**Response:** `200` — array of:
```json
[
  {
    "market_id": 0,
    "market": "BTC/USDC",
    "side": 0,
    "size": 1.84,
    "notional": 118200.0,
    "avg_entry_price": 61840.0,
    "mark_price": 64210.0,
    "liquidation_price": 57110.0,
    "margin": 14080.0,
    "leverage": 8.4,
    "unrealized_pnl": 4360.0,
    "roe": 30.96
  }
]
```
| field | type | notes |
|---|---|---|
| `market_id` / `market` | number / string | id + display name |
| `side` | number | 0 long, 1 short |
| `size` | number | absolute position size (coins) |
| `notional` | number | size × mark, USD |
| `avg_entry_price` / `mark_price` / `liquidation_price` | number | USD |
| `margin` | number | margin allocated to position, USD |
| `leverage` | number | effective leverage |
| `unrealized_pnl` | number | USD |
| `roe` | number | uPnL / margin × 100, percent |

**Source:** identical derivation to the existing
`GET /markets/{market}/positions/open` (`OpenPosition`) — including the **G1**
liquidation-price formula already implemented — but keyed by **account** across
all markets instead of by market. **Gap:** only the by-market variant exists.
`margin`/`roe` are the only additions over the existing struct.

---

### 3. Wallet overview — `GET /api/v1/wallets/{address}/overview`
Powers the wallet-detail header + the Account Value stat row.

**Query:** `env`.

**Response:** `200`
```json
{
  "address": "0xfea8…4fd8",
  "first_seen": "2024-08-03T12:14:00Z",
  "trades_count": 1284,
  "win_rate": 0.62,
  "direction_bias": 0.68,
  "avg_leverage": 8.4,
  "perp_equity": 248120.55,
  "account_value": 248120.55,
  "unrealized_pnl": 12840.0,
  "all_time_pnl": 96120.0,
  "roi": 0.30,
  "volume_30d": 8420000.0,
  "segment_id": 4,
  "segment_label": "Whale"
}
```
| field | type | notes |
|---|---|---|
| `first_seen` | string | earliest fill time |
| `trades_count` | number | lifetime fills (or closed trades) |
| `win_rate` | number | 0–1, share of closed trades with net_pnl > 0 |
| `direction_bias` | number | 0–1 = share of current notional that is long |
| `avg_leverage` | number | avg effective leverage of open positions |
| `perp_equity` / `account_value` | number | USD (spot omitted — **G8**) |
| `unrealized_pnl` / `all_time_pnl` | number | USD |
| `roi` | number | all_time_pnl / cost basis (ratio) |
| `volume_30d` | number | trailing-30d notional traded, USD |
| `segment_id` / `segment_label` | number / string | cohort membership (**G2**) |

**Source:** `account_equity_snapshots` (equity/uPnL/total PnL),
`perps_fills`/`closed_trades` (counts, win rate, first seen, 30d volume),
`account_positions` (bias, avg leverage), `account_segments` (cohort).
**Note:** `spot` equity is intentionally omitted (**G8** deferred); frontend
renders Spot as "—".

---

## Priority 2 — Wallet list ("Hot Wallets")

### 4. Volume-ranked enriched leaderboard — `GET /api/v1/leaderboards/volume`
Powers the **Hot Wallets** table ("top whales by 30D volume"). Either a new
endpoint or extend `GET /leaderboards/perp-pnl` with a `sort` param + extra
fields; a dedicated endpoint is cleaner.

**Query:** `window=24h|7d|30d` (default `30d`), `env`, `limit`, `offset`.

**Response:** `200` — array of:
```json
[
  {
    "rank": 1,
    "address": "0xfea8…4fd8",
    "equity": 9500000.0,
    "volume": 190000000.0,
    "pnl": 9100000.0,
    "win_rate": 0.62,
    "long_pct": 0.68,
    "top_market": "BTC/USDC",
    "trades_count": 1284,
    "segment_id": 4,
    "segment_label": "Whale"
  }
]
```
| field | type | notes |
|---|---|---|
| `rank` | number | 1-based, by `volume` desc for the window |
| `equity` | number | latest equity, USD |
| `volume` | number | window notional traded, USD |
| `pnl` | number | window PnL, USD |
| `win_rate` | number | 0–1 |
| `long_pct` | number | 0–1, long share of current notional (bias bar) |
| `top_market` | string \| null | highest-notional current market |
| `trades_count` | number | window fills |
| `segment_*` | number / string | cohort label/tag shown on the row |

**Source:** `account_volume_1h` (window volume) joined to latest
`account_equity_snapshots`, `account_pnl_1h`, `closed_trades` (win rate),
`account_positions` (long_pct, top_market), `account_segments`.
**Gap:** current `perp_pnl` ranks by total PnL and lacks volume/win/bias/top.

---

## Priority 3 — Cohorts & Heatmap (market structure, **G2**)

### 5. Segment summary — extend `GET /api/v1/segments/{id}/summary`
The **Cohorts** table needs four fields the current `SegmentSummary` lacks. Add
them to the existing response (additive, non-breaking):

```json
{
  "net_bias": 0.56,
  "pnl_24h": 184000.0,
  "trend_7d": [100.0, 101.4, 99.8, 103.1, 104.0, 106.2, 108.0],
  "top_market": "BTC/USDC"
}
```
| field | type | notes |
|---|---|---|
| `net_bias` | number | 0–1, long share of cohort's aggregate notional |
| `pnl_24h` | number | cohort PnL over trailing 24h, USD |
| `trend_7d` | number[] | ~7–24 points of cohort equity for the row sparkline |
| `top_market` | string \| null | cohort's most-held market |

**Source:** `account_positions` + `account_segments` (bias, top market),
`account_pnl_1h` (24h, 7d trend) rolled up per segment.

---

### 6. Cohort × market bias matrix — `GET /api/v1/markets/heatmap/bias`
Powers the **Position Heat Map** (rows = markets, cols = cohorts, cell = % net
long).

**Query:** `env`.

**Response:** `200`
```json
{
  "segments": [{ "segment_id": 0, "label": "Shrimp" }],
  "markets": [
    {
      "market_id": 0,
      "market": "BTC/USDC",
      "cells": [ { "segment_id": 0, "net_long": 0.62, "notional": 4200000.0 } ]
    }
  ]
}
```
| field | type | notes |
|---|---|---|
| `segments[]` | object | column order/labels |
| `markets[].cells[].net_long` | number | −1..+1 (−1 all short, +1 all long) |
| `markets[].cells[].notional` | number | cohort notional in that market, USD (for tooltip / weighting) |

**Source:** `oi_account_snapshots` (or `account_positions`) joined to
`account_segments`, aggregated per (market, segment). **Gap:** no per-segment
per-market rollup exists.

---

## Priority 4 — Liquidations (**G1** inputs exist; needs enrichment)

### 7. Liquidation fills — `GET /api/v1/liquidations/fills`
Powers the **Recent Liquidations** table. The current `GET /liquidations`
returns only `account/liquidator/market_id/order_id/tx_hash` — no size/price/
value/side. Provide an enriched stream (join `liquidations` → `perps_fills`).

**Query:** `env`, `market` (optional filter), `limit`, `offset`, `from`, `to`.

**Response:** `200` — array of:
```json
[
  {
    "block_timestamp": "2026-06-21T13:59:51Z",
    "account": "0x91a2…",
    "market_id": 0,
    "market": "BTC/USDC",
    "side": 0,
    "price": 62290.0,
    "size": 1.84,
    "value": 114600.0,
    "tx_hash": "0x…"
  }
]
```
| field | type | notes |
|---|---|---|
| `side` | number | 0 = long liquidated, 1 = short liquidated |
| `price` | number | liquidation fill price, USD |
| `size` | number | coins |
| `value` | number | size × price, USD notional |

**Source:** `liquidations` joined to the matching `perps_fills`
(price/size/side) — the **G-item** `GET /fills/liquidation` in API_DESIGN §4.6.

---

### 8. Liquidation stats — `GET /api/v1/stats/liquidations`
Powers the 5 liquidation stat cards + "Positions At Risk".

**Query:** `env`, `window=24h` (default).

**Response:** `200`
```json
{
  "window": "24h",
  "total_value": 28400000.0,
  "total_count": 1842,
  "long_value": 18100000.0,
  "short_value": 10300000.0,
  "largest": { "value": 1240000.0, "market": "BTC/USDC", "side": 0, "account": "0x91a2…" },
  "at_risk_count": 214,
  "at_risk_notional": 6700000.0,
  "positions_at_risk": [
    { "market_id": 0, "market": "BTC/USDC", "distance_pct": 0.08, "notional": 9200000.0 }
  ]
}
```
| field | type | notes |
|---|---|---|
| `total_value`/`long_value`/`short_value` | number | liquidated notional in window, USD |
| `largest` | object | single biggest liquidation in window |
| `at_risk_count` | number | open positions within 25% of liq price |
| `positions_at_risk[].distance_pct` | number | 0–1, (mark→liq distance)/mark, asc |
| `positions_at_risk[].notional` | number | at-risk notional, USD |

**Source:** aggregate of endpoint #7 (window totals/largest); `positions_at_risk`
derives from open positions where `|mark − liq| / mark ≤ 0.25` (reuses **G1**
liq price). Could also fall back to the existing `liquidation-heatmap` buckets
nearest mark.

---

## Priority 5 — Radar (new subsystem)

### 9. Radar trending — `GET /api/v1/radar/trending`
Powers the 4 trending cards (Most Net Bought / Sold / Biggest Open / Most Crowded).

**Query:** `env`, `window=24h` (default).

**Response:** `200`
```json
{
  "most_net_bought": { "market": "RISE/USDC", "value": 8400000.0, "detail": "+1,204 longs opened" },
  "most_net_sold":   { "market": "SOL/USDC",  "value": -5100000.0, "detail": "872 shorts opened" },
  "biggest_open":    { "market": "BTC/USDC",  "value": 4200000.0, "account": "0x91a2…", "leverage": 14, "side": 0 },
  "most_crowded":    { "market": "HYPE/USDC", "crowd_pct": 0.81 }
}
```
**Source:** windowed net position-delta per market from `perps_fills` /
`oi_account_snapshots`; "biggest open" = largest single new position; "most
crowded" = market with highest share of cohorts net-long (reuses #6).

---

### 10. Radar activity feed — `GET /api/v1/radar/activity`
Powers the live **smart-money feed**. Stream of notable recent events.

**Query:** `env`, `min_notional` (default e.g. 50000), `limit`, `segment_id`
(optional, restrict to a cohort), `from`.

**Response:** `200` — array of:
```json
[
  {
    "time": "2026-06-21T14:00:00Z",
    "action": "long_opened",
    "market": "BTC/USDC",
    "side": 0,
    "leverage": 14,
    "notional": 4200000.0,
    "price": 64210.0,
    "account": "0x91a2…",
    "segment_id": 4,
    "segment_label": "Whale"
  }
]
```
| field | type | notes |
|---|---|---|
| `action` | string | `long_opened`/`short_opened`/`long_added`/`position_closed`/`short_closed`/`realized_profit`/`liquidated` |
| `notional` | number | event size, USD; filter by `min_notional` |
| `segment_*` | number / string | cohort tag shown on the row |

**Source:** `perps_fills` interpreted via `position_before/after` to classify the
action, filtered to large notionals, enriched with `account_segments`. Ordered
by time desc. **Gap:** no event-classification/feed endpoint exists.

---

## Priority 5b — Address autocomplete search

### 12. Wallet search — `GET /api/v1/wallets/search`
Powers the address-input autocomplete (header + "Track any wallet"). Without it,
the dropdown matches only recently-searched + top wallets held client-side; this
endpoint upgrades it to intelligent matching across **all** tracked wallets.

**Query:** `q` (partial address or label, case-insensitive; `0x` prefix
optional), `env`, `limit` (default 10).

**Response:** `200` — array of:
```json
[
  {
    "address": "0xfea8…4fd8",
    "equity": 248120.55,
    "segment_id": 4,
    "segment_label": "Whale"
  }
]
```
| field | type | notes |
|---|---|---|
| `address` | string | matched 0x-hex address |
| `equity` | number \| null | latest equity, USD (for ranking/secondary text) |
| `segment_*` | number / string \| null | cohort tag shown on the row |

**Source:** prefix/substring match on `account_registry.address` (and optional
label), ranked by equity desc, capped at `limit`. **Gap:** no wallet search
endpoint exists; the client can only match addresses it has already fetched.

---

## Priority 5c — Token / asset metadata (dynamic icons)

### 13. Market catalog with token identity — `GET /api/v1/markets`
Lets the frontend resolve **token icons + metadata dynamically** for every
listed market, so newly-listed assets light up automatically with no manual
front-end change. Today the dashboard maps symbol → icon via a hand-curated
registry; that works but must be edited per new asset. This endpoint replaces
that with backend-supplied identity.

A dedicated markets catalog is the natural home for this (the existing
`markets/open-interest` is a live snapshot, not a catalog). Alternatively the
same `token` block below can be added to the market objects already returned by
`open-interest` / `summary`.

**Query:** `env`.

**Response:** `200` — array of:
```json
[
  {
    "market_id": 0,
    "name": "BTC/USDC",
    "base_asset": "BTC",
    "quote_asset": "USDC",
    "leverage_max": 50,
    "token": {
      "logo_url": "https://.../btc.png",
      "chain": "bitcoin",
      "token_address": null,
      "is_native": true
    }
  }
]
```

| field | type | notes |
|---|---|---|
| `market_id` | number | canonical id |
| `name` | string | display name (e.g. `BTC/USDC`) |
| `base_asset` / `quote_asset` | string | symbols |
| `leverage_max` | number \| null | from `market_configs` (optional, handy elsewhere) |
| `token` | object \| null | identity used to render the icon (see below) |

**`token` block — provide whichever you can; the frontend prefers them in this order:**

| field | type | notes |
|---|---|---|
| `logo_url` | string \| null | **Preferred.** A direct, authoritative image URL. If set, the frontend uses it as-is — no slug/address logic needed. Can point at Trust Wallet, your own CDN, or anywhere. |
| `chain` | string \| null | Trust Wallet blockchain **slug** if you'd rather the frontend construct the URL: `ethereum`, `smartchain`, `solana`, `arbitrum`, `optimism`, `avalanchec`, `polygon`, `bitcoin`, `ripple`, `doge`, `ton`, `near`, `sui`, `sei`, … (must match Trust Wallet's folder names). |
| `token_address` | string \| null | Contract address on `chain`. **EVM addresses must be EIP-55 checksummed** — Trust Wallet's paths are case-sensitive. `null` for native coins. |
| `is_native` | boolean | `true` → native coin (URL uses `…/{chain}/info/logo.png`); `false` → token (URL uses `…/{chain}/assets/{token_address}/logo.png`). |

**How the frontend resolves an icon (so you know what each field drives):**
1. If `token.logo_url` is set → use it directly.
2. Else if `token.chain` (+ `token_address` for non-native) is set → build the
   Trust Wallet jsDelivr URL:
   - native: `https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/{chain}/info/logo.png`
   - token: `https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/{chain}/assets/{token_address}/logo.png`
3. Else (or on image load error) → fall back to the curated registry, then to a
   colored letter chip. So a `null` `token` block never breaks the UI — it just
   degrades to a chip.

**Recommendation:** populate `logo_url` when you can (most robust — immune to
Trust Wallet slug/checksum quirks and to assets Trust Wallet doesn't carry, e.g.
RISE/HYPE, where you can point at your own CDN). Use `chain`/`token_address` as a
structured alternative when you'd rather lean on Trust Wallet.

**Source:** extend `market_configs` (or a new `token_metadata` table) with the
base asset's chain + checksummed address and/or a logo URL. Optionally seed from
the Trust Wallet repo (https://github.com/trustwallet/assets) or a price-data
provider keyed by your listing process.

---

## Priority 6 — Optional efficiency

### 11. Markets summary — `GET /api/v1/markets/summary`
Lets the **Perps** table render in one call instead of N candle calls. Optional;
the table works today by combining `markets/open-interest` + per-market
`candles`, just more chatty.

**Query:** `env`.

**Response:** `200` — array of:
```json
[
  {
    "market_id": 0,
    "market": "BTC/USDC",
    "mark_price": 64210.0,
    "change_24h": 0.021,
    "open_interest": 118000000.0,
    "funding_1h": 0.000089,
    "volume_24h": 540000000.0,
    "long_pct": 0.54,
    "spark_24h": [63900.0, 64010.0, 64210.0]
  }
]
```
**Source:** `oi_market_snapshots` + `perps_candles_1h` + `funding_rate_history`,
joined per market.

---

## Summary table

| # | Endpoint | Screen | Gap | Priority |
|---|---|---|---|---|
| 1 | `GET /wallets/{a}/equity-history` | Wallet detail chart | new | P1 |
| 2 | `GET /wallets/{a}/positions/open` | Wallet positions/exposure | new (by-account variant of existing) | P1 |
| 3 | `GET /wallets/{a}/overview` | Wallet header/value | new (**G2/G8**) | P1 |
| 4 | `GET /leaderboards/volume` | Hot Wallets | new / extend perp-pnl | P2 |
| 5 | extend `GET /segments/{id}/summary` | Cohorts table | additive (**G2**) | P3 |
| 6 | `GET /markets/heatmap/bias` | Position Heat Map | new (**G2**) | P3 |
| 7 | `GET /liquidations/fills` | Recent liquidations | new (**G1** join) | P4 |
| 8 | `GET /stats/liquidations` | Liq stat cards / at-risk | new (**G1**) | P4 |
| 9 | `GET /radar/trending` | Radar cards | new | P5 |
| 10 | `GET /radar/activity` | Radar feed | new | P5 |
| 11 | `GET /markets/summary` | Perps table (perf) | optional | P6 |
| 12 | `GET /wallets/search?q=` | Address autocomplete | new | P5 |
| 13 | `GET /markets` (+ `token` block) | Dynamic token icons/metadata | new | P5 |
