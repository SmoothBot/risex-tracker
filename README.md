# RISEx Tracker

A public, read-only trader & market analytics dashboard for RISEx, built on top
of the RISEx Analytics API (`risex-api`).

Six screens: **Wallet** (list + detail), **Perps**, **Radar**, **Cohorts**,
**Position Heat Map**, and **Liquidations**.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind v4** over the RISEx design tokens (`styles/tokens.css`)
- **TanStack Query** for data fetching (client-side, polling)
- **zod** for response validation
- Bundled **Geist** fonts; Inter / Geist Mono / Bai Jamjuree from Google Fonts

## Architecture

- The dashboard is **public — no login, no wallet connect.** You view any
  address by pasting it into the header search or the "Track any wallet" box.
- All API calls go through a **server-side proxy** (`app/api/proxy/[...path]`)
  which injects the upstream bearer key, so the key never reaches the browser.
- One typed, zod-validated **query hook per resource** (`lib/api/hooks.ts`),
  with uniform loading / empty / error states (`components/ui/states.tsx`).

```
app/                 routes (one folder per screen) + api/proxy
components/
  shell/             sidebar, header, app shell
  ui/                primitives (Card, DataTable, StatCard, charts, …)
  screens/           one folder per screen, composed from ui/
lib/
  api/               client, zod schemas, query hooks
  mock/              deterministic fixtures (mock mode)
  format.ts          number / value formatting
styles/              design tokens + globals
docs/                API_GAPS.md + design spec
```

## Develop

```bash
npm install
cp .env.example .env       # set RISEX_API_URL / RISEX_API_KEY, or use mock mode
npm run dev                # http://localhost:3000
```

**Mock mode** (no warehouse needed — deterministic data for every screen):

```bash
RISEX_API_MOCK=1 npm run dev
```

## Test

```bash
npm run test:e2e           # Playwright smoke suite (runs against mock mode)
```

## API gaps

Several features need API endpoints that `risex-api` doesn't serve yet (wallet
equity history, per-wallet open positions, the Radar feed, the cohort×market
bias matrix, enriched liquidations, …). These are specified as contracts in
[`docs/API_GAPS.md`](docs/API_GAPS.md). The frontend codes against those
contracts and shows "coming soon" empty states until they ship. The full design
is in [`docs/superpowers/specs/`](docs/superpowers/specs/).
