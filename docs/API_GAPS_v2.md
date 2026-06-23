# RISEx Tracker — Open API Issues

Status as of 2026-06-21, after several backend passes. This lists only the
**unresolved** items found while integrating the dashboard against the live API
(`https://api.risescan.io`, `/api/v1/`). Original endpoint contracts are in
[`API_GAPS.md`](API_GAPS.md). Items ordered by impact.

---

## 1. `equity-history` — `pnl` is wrong, `upnl` missing *(blocks the PnL chart)*

The wallet **Account PnL** chart needs realized PnL (dotted, behind) + unrealized
PnL (solid, front). Two problems with `GET /wallets/{address}/equity-history`:

1. **`pnl` is not PnL — it's the equity curve rebased to the window start.**
   Verified: `pnl[i] == equity[i] − equity[windowStart]` for **every** point (the
   difference is exactly `0.0`). So the PnL line is just the equity line shifted
   down by the starting equity — it carries no independent information and resets
   to 0 at the start of each selected range.
   **Expected:** real **cumulative realized PnL** (Σ realized trade PnL − fees ±
   funding), independent of current equity level and not reset per window.

2. **No `upnl` field.** Points are `{t, equity, pnl}`. Add `upnl` (unrealized PnL
   at each bucket) so the uPnL line is real.

Until both land, the chart shows the (incorrect) `pnl` as a single solid line.
The frontend already renders the dual line (uPnL solid + realized PnL dotted) and
just needs correct data — confirmed working against mock data with both fields.

---

## 2. `GET /stats/positions` is slow (~20s) *(performance)*

Cold latency ~20s. Powers **Combined Equity** on the wallet home page (shows "—"
until it resolves) and the Perps "active markets / traders" stat. Same flavor as
the volume leaderboard that was fixed — an unindexed aggregate across all
accounts. **RFC:** materialize/cache the snapshot aggregate; target sub-second.

---

## 3. Minor

- **Deprecated market still in `/markets` catalog.** `DOGE/USDC
  [deprecated-1779958099]` is still returned by `GET /markets` (it's now correctly
  excluded from `/markets/summary` and `/markets/heatmap/bias`). No UI impact —
  the catalog only feeds the token-icon map — but a `visible`/`deprecated` flag
  (or excluding it) would be cleaner than clients string-matching the name.
- **Radar `leverage` is null.** `radar/trending.biggest_open.leverage` and
  `radar/activity[].leverage` come back `null`, so the Radar UI omits the `N×`
  leverage. Populate if the data is available.

---

## Resolved since the last revision (for reference)

- ✅ `equity-history` honors `interval` **and** `resolution` (24h@1m → ~1,400
  points); recency fixed (24h returns up-to-now data).
- ✅ `segments/{id}/summary.trend_7d` now returns ~19 points (cohort sparklines
  render).
- ✅ `GET /leaderboards/volume` ~0.3s (was 24–125s) — Hot Wallets loads instantly.
- ✅ `GET /wallets/search?q=` live and wired into the address autocomplete.
- ✅ `/markets` token `logo_url` now provided for ONDO and DOGE (HYPE/TAO/VVV/LIT
  have no Trust Wallet asset — frontend letter-chip fallback, expected).
- ✅ Deprecated market removed from `/markets/summary` and `/markets/heatmap/bias`.
- ✅ Nullability across `markets/summary`, `leaderboards/volume`, `wallets/overview`,
  `radar` — handled client-side; no backend change needed.
