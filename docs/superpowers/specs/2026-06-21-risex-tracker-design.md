# RISEx Tracker — Design Spec

Date: 2026-06-21
Status: Approved (build authorized)

A public, read-only trader/market analytics dashboard for RISEx, built over the
`risex-api` warehouse API. Six screens: Wallet (list + detail), Perps, Radar,
Cohorts, Position Heat Map, Liquidations.

## Decisions

- **Stack:** Next.js (App Router) + TypeScript. Tailwind v4 over the handover
  design tokens (`colors_and_type.css`). TanStack Query for data. shadcn where
  it helps. Bundled Geist fonts; Inter / Geist Mono / Bai Jamjuree from Google.
- **Auth:** dashboard is **public, no login / no wallet connect**. A server-side
  Next route handler proxies all API calls and injects the upstream bearer key,
  so the key never reaches the browser.
- **Data fetching:** client-side TanStack Query → `/api/proxy/*`. One typed,
  zod-validated hook per resource; uniform loading / empty / error states. Live
  screens poll (5–15s).
- **API gaps:** specified as contracts in `docs/API_GAPS.md`; frontend codes to
  them and shows empty states until the ETL team ships them. We do **not** edit
  the Rust repo here.
- **Source of truth for visuals:** `HyperTracker_handover/`. Do not reference
  "HyperTracker" anywhere in committed code/UI.

## Architecture

```
app/
  layout.tsx, page.tsx (→ /wallets)
  wallets/page.tsx, wallets/[address]/page.tsx
  perps/, radar/, cohorts/, heatmap/, liquidations/  (page.tsx each)
  api/proxy/[...path]/route.ts          # GET-only proxy → ${RISEX_API_URL}/api/v1/*
components/
  shell/   # Sidebar, Header, StatusFooter, AppShell
  ui/      # Card, StatCard, StatGrid, DataTable, Sparkline, AreaChart,
           # Tag, BiasBar, CoinChip, EmptyState, ErrorState, Skeleton
  screens/ # one folder per screen
lib/
  api/     # client.ts, types (zod), hooks (one file per resource)
  format.ts  # cUSD, cComp, cSg, cPct, fmtPrice, col (ported from mockup)
  query.ts   # QueryClient + provider
styles/ tokens.css (verbatim handover), globals.css
public/fonts/ (Geist .ttf), public/brand/ (mark + wordmark)
```

### Proxy
`app/api/proxy/[...path]/route.ts`: forwards `GET /api/proxy/<rest>?<query>` to
`${RISEX_API_URL}/api/v1/<rest>?<query>` with `Authorization: Bearer
${RISEX_API_KEY}`. Env: `RISEX_API_URL`, `RISEX_API_KEY`. Read-only; passes
through `env/limit/offset/from/to`. Returns upstream JSON + status; normalizes
errors to `{ error }`.

### Design system
- `styles/tokens.css` = handover `colors_and_type.css` verbatim. Tailwind v4
  `@theme` maps `--rx-*` → utilities. No hardcoded colors/spacing/type.
- Port mockup helpers: number formatting (`lib/format.ts`) and the SVG
  `Sparkline` / `AreaChart` (equity chart with hover crosshair + tooltip) and
  `LiquidationMap` / `Heatmap` renderers as real React components.

## Screens → data (see API_GAPS.md for gap contracts)

- **Perps** — live. Stat cards (OI/skew/markets ← `markets/open-interest`;
  vol ← `stats/perp-volume`; funding ← `markets/{m}/funding`). Markets table
  (OI/skew ← open-interest; price/24h/spark ← `markets/{m}/candles`, or gap #11
  `markets/summary`). Sort tabs: OI / Volume / Funding / 24h.
- **Cohorts** — `segments` + `segments/{id}/summary` (live); net bias / 7d trend
  / top market via gap #5.
- **Liquidations** — liq map ← `markets/{m}/liquidation-heatmap` (live); feed +
  stat cards + at-risk via gaps #7, #8.
- **Wallet list** — stat cards (`segments` count, `stats/positions`,
  `stats/perp-volume`); Hot Wallets table via gap #4 (`leaderboards/volume`).
- **Wallet detail** — fills ← `wallets/{a}/fills` (live); equity chart (gap #1),
  open positions + exposure (gap #2), header/value (gap #3). Spot equity shown
  as "—" (G8 deferred).
- **Radar** — gaps #9 (trending) + #10 (activity feed).
- **Heatmap** — gap #6 (`markets/heatmap/bias`).

## Phasing (each independently shippable)

- **P1 Foundation** — Next app, tokens/fonts, Tailwind, proxy, Query, AppShell,
  `ui/` primitives, format + chart/sparkline components.
- **P2 Live screens** — Perps, Cohorts.
- **P3 Wallet** — list + detail (live data; gap widgets → empty states wired to
  contracts).
- **P4 Liquidations** — heatmap live; feed/stats behind gap contracts.
- **P5 Gap screens** — Radar + Heatmap; swap empty→real as contracts ship.

## Testing
- Component-level: render with mocked Query responses (live + empty + error).
- E2E smoke via Playwright: each route renders, nav works, no console errors,
  empty states show where gaps are unfilled. Screenshots per screen for review.

## Non-goals
- No wallet connect / transactions / login.
- No editing of the Rust API in this repo.
- No spot equity, builder identity, verified/named wallets (deferred gaps).
