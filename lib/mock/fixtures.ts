import { tokenMeta } from "../tokens/registry";

// Deterministic mock data for the RISEx API + gap contracts. Enabled via
// RISEX_API_MOCK=1 on the proxy, so the dashboard renders fully for review/tests
// without a live warehouse. Shapes match lib/api/schemas.ts exactly.

const NOW = Date.parse("2026-06-21T14:00:00Z");

// Seeded RNG (mulberry32) — stable output per seed.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function iso(ms: number): string {
  return new Date(ms).toISOString();
}

// Live RISEx markets (https://api.rise.trade/v1/markets), with current-ish
// reference prices. The deprecated duplicate DOGE market is intentionally omitted.
const MK: [string, number][] = [
  ["BTC", 64182], ["ETH", 1730.2], ["BNB", 588.7], ["SOL", 73.18],
  ["HYPE", 69.04], ["XRP", 1.1438], ["TAO", 236.04], ["ZEC", 464.8],
  ["ONDO", 0.3373], ["NEAR", 2.196], ["VVV", 14.397], ["LIT", 1.584],
  ["DOGE", 0.08330],
];
const SEGMENTS = [
  { id: 0, slug: "shrimp", label: "Shrimp" },
  { id: 1, slug: "fish", label: "Fish" },
  { id: 2, slug: "dolphin", label: "Dolphin" },
  { id: 3, slug: "shark", label: "Shark" },
  { id: 4, slug: "whale", label: "Whale" },
];

function marketName(coin: string) {
  return `${coin}/USDC`;
}
function coinFor(idOrName: string): [string, number] {
  // accept market_id (numeric) or "BTC/USDC" or "BTC"
  if (/^\d+$/.test(idOrName)) return MK[Number(idOrName)] ?? MK[0];
  const base = idOrName.split(/[/\-]/)[0].toUpperCase();
  return MK.find((m) => m[0] === base) ?? MK[0];
}
function walk(R: () => number, start: number, n: number, vol: number, drift: number) {
  let v = start;
  const o: number[] = [];
  for (let i = 0; i < n; i++) {
    v = v * (1 + drift + (R() - 0.5) * vol);
    if (v < start * 0.25) v = start * 0.25;
    o.push(v);
  }
  return o;
}

export function mockResponse(
  path: string,
  search: URLSearchParams,
): unknown | undefined {
  const R = rng(seedFrom(path + "?" + search.toString()));
  const parts = path.split("/").filter(Boolean);
  const limit = Number(search.get("limit") || 100);

  // markets/...
  if (parts[0] === "markets") {
    if (parts.length === 1) {
      // Catalog (gap #13) — token identity for dynamic icons.
      return MK.map(([coin], i) => ({
        market_id: i,
        name: marketName(coin),
        base_asset: coin,
        quote_asset: "USDC",
        leverage_max: 20,
        token: { logo_url: tokenMeta(coin)?.logo ?? null, chain: null, token_address: null, is_native: null },
      }));
    }
    if (parts[1] === "open-interest") {
      return MK.map(([coin, price], i) => {
        const r = rng(seedFrom("oi" + coin))();
        const longOi = (8 + r * 180) * 1e6;
        const shortOi = longOi * (0.7 + r * 0.6);
        return {
          market_id: i,
          name: marketName(coin),
          snapshot_time: iso(NOW),
          long_oi: longOi / price,
          short_oi: shortOi / price,
          long_oi_notional: longOi,
          short_oi_notional: shortOi,
          num_longs: Math.round(40 + r * 600),
          num_shorts: Math.round(30 + r * 500),
        };
      });
    }
    if (parts[1] === "summary") {
      return MK.map(([coin, price], i) => {
        const r = rng(seedFrom("sum" + coin));
        const chg = (r() - 0.45) * 0.09;
        return {
          market_id: i,
          market: marketName(coin),
          mark_price: price,
          change_24h: chg,
          open_interest: (8 + r() * 180) * 1e6,
          funding_1h: (r() - 0.5) * 0.0006,
          volume_24h: (20 + r() * 900) * 1e6,
          long_pct: 0.38 + r() * 0.3,
          spark_24h: walk(r, price, 32, 0.02, chg > 0 ? 0.003 : -0.003),
        };
      });
    }
    if (parts[1] === "heatmap" && parts[2] === "bias") {
      return {
        segments: SEGMENTS.map((s) => ({ segment_id: s.id, label: s.label })),
        markets: MK.map(([coin], i) => ({
          market_id: i,
          market: marketName(coin),
          cells: SEGMENTS.map((s) => {
            const r = rng(seedFrom("bias" + coin + s.id))();
            let b = (r - 0.5) * 1.7;
            if (coin === "BTC" || coin === "ETH") b += 0.25;
            if (s.id < 2) b -= r * 0.3;
            b = Math.max(-1, Math.min(1, b));
            return {
              segment_id: s.id,
              net_long: b,
              notional: (0.2 + r) * 5e6,
            };
          }),
        })),
      };
    }
    // markets/{m}/...
    const market = decodeURIComponent(parts[1] || "0");
    const [coin, price] = coinFor(market);
    if (parts[2] === "candles") {
      const n = Math.min(limit, 48);
      const series = walk(R, price, n, 0.02, 0.001);
      return series.map((v, i) => ({
        bucket: iso(NOW - (n - 1 - i) * 3600_000),
        open: v * (1 - 0.003),
        high: v * (1 + 0.006),
        low: v * (1 - 0.006),
        close: v,
        volume: (1 + R() * 9) * 1e6,
        fill_count: Math.round(100 + R() * 4000),
      }));
    }
    if (parts[2] === "funding") {
      const n = Math.min(limit, 72);
      let acc = 0;
      return Array.from({ length: n }, (_, i) => {
        const fr = (R() - 0.5) * 0.0006;
        acc += fr;
        return {
          bucket: iso(NOW - (n - 1 - i) * 3600_000),
          funding_rate: fr,
          accumulated: acc,
          index_price: price * (1 + (R() - 0.5) * 0.01),
        };
      });
    }
    if (parts[2] === "positions" && parts[3] === "open") {
      return openPositions(R, coin, price, market, 24);
    }
    if (parts[2] === "liquidation-heatmap") {
      const buckets = Number(search.get("buckets") || 24);
      return Array.from({ length: buckets }, (_, i) => {
        const frac = (0.16 * (buckets / 2 - i)) / (buckets / 2);
        const pl = price * (1 + frac);
        const isShort = pl > price;
        const amt =
          (0.3 + R() * 1.2) * Math.exp(-Math.abs(frac) * 8) * 9e6 +
          (0.1 + R() * 0.4) * 1e6;
        return {
          price_low: pl * 0.997,
          price_high: pl * 1.003,
          long_notional: isShort ? 0 : amt,
          short_notional: isShort ? amt : 0,
          position_count: Math.round(5 + R() * 200),
        };
      });
    }
  }

  // stats/...
  if (parts[0] === "stats") {
    if (parts[1] === "perp-volume") {
      const n = Math.min(limit, 48);
      return Array.from({ length: n }, (_, i) => ({
        bucket: iso(NOW - (n - 1 - i) * 3600_000),
        volume: (200 + R() * 600) * 1e6,
        fees: (0.05 + R() * 0.15) * 1e6,
        fills: Math.round(5000 + R() * 40000),
        unique_accounts_est: Math.round(300 + R() * 1200),
      }));
    }
    if (parts[1] === "positions") {
      return {
        long_oi_notional: 1.42e9,
        short_oi_notional: 1.21e9,
        num_longs: 7421,
        num_shorts: 6233,
        accounts_in_profit: 612,
        accounts_total: 1284,
        total_equity: 2.44e9,
        as_of: iso(NOW),
      };
    }
    if (parts[1] === "liquidations") {
      return {
        window: "24h",
        total_value: 28.4e6,
        total_count: 1842,
        long_value: 18.1e6,
        short_value: 10.3e6,
        largest: {
          value: 1.24e6,
          market: "BTC/USDC",
          side: 0,
          account: "0x91a2c4f8b1e0a3d2c5f6079a8b1c2d3e4f5a6b7c",
        },
        at_risk_count: 214,
        at_risk_notional: 6.7e6,
        positions_at_risk: (
          [["BTC", 0.08, 9.2e6], ["ETH", 0.12, 4.1e6], ["SOL", 0.15, 2.8e6],
           ["HYPE", 0.22, 1.9e6], ["ZEC", 0.18, 1.1e6], ["TAO", 0.06, 0.8e6]] as [string, number, number][]
        ).map(([c, d, v], i) => ({
          market_id: MK.findIndex((m) => m[0] === c),
          market: marketName(c),
          distance_pct: d,
          notional: v,
        })),
      };
    }
  }

  // leaderboards/...
  if (parts[0] === "leaderboards") {
    if (parts[1] === "perp-pnl") {
      return hotWallets(limit).map((w, i) => ({
        address: w.address,
        account_id: 1000 + i,
        collateral: w.equity * 0.6,
        unrealized_pnl: w.pnl * 0.2,
        realized_pnl: w.pnl * 0.8,
        total_pnl: w.pnl,
        equity: w.equity,
        num_positions: Math.round(2 + (i % 7)),
        snapshot_time: iso(NOW),
      }));
    }
    if (parts[1] === "volume") {
      return hotWallets(Math.min(limit, 25));
    }
  }

  // segments/...
  if (parts[0] === "segments") {
    if (parts.length === 1) {
      return SEGMENTS.map((s, i) => ({
        segment_id: s.id,
        slug: s.slug,
        label: s.label,
        member_count: Math.round(60 + i * 180 + R() * 80),
      }));
    }
    const id = Number(parts[1]);
    if (parts[2] === "summary") {
      const r = rng(seedFrom("seg" + id));
      const avg = 10e6 / Math.pow(3, 4 - id);
      const members = Math.round(60 + (4 - id) * 180);
      return {
        segment_id: id,
        member_count: members,
        total_equity: avg * members,
        avg_equity: avg,
        total_realized_pnl: (r() - 0.4) * avg * members * 0.05,
        total_unrealized_pnl: (r() - 0.45) * avg * members * 0.02,
        total_pnl: (r() - 0.4) * avg * members * 0.06,
        accounts_in_profit: Math.round(members * (0.4 + r() * 0.3)),
        net_bias: 0.42 + r() * 0.3,
        pnl_24h: (r() - 0.4) * avg * members * 0.01,
        trend_7d: walk(r, 100, 16, 0.05, r() > 0.5 ? 0.01 : -0.008),
        top_market: marketName(MK[Math.floor(r() * 6)][0]),
      };
    }
    if (parts[2] === "wallets") {
      return hotWallets(20).map((w, i) => ({
        address: w.address,
        account_id: 2000 + i,
        equity: w.equity,
        total_pnl: w.pnl,
        num_positions: Math.round(2 + (i % 6)),
      }));
    }
  }

  // liquidations
  if (parts[0] === "liquidations") {
    if (parts[1] === "fills") {
      return Array.from({ length: Math.min(limit, 25) }, (_, i) => {
        const [coin, price] = MK[Math.floor(R() * 8)];
        const lng = R() > 0.4;
        const v = (20 + R() * 900) * 1000;
        return {
          block_timestamp: iso(NOW - i * 3000 - Math.floor(R() * 4000)),
          account: randAddr(R),
          market_id: MK.findIndex((m) => m[0] === coin),
          market: marketName(coin),
          side: lng ? 0 : 1,
          price: price * (1 + (lng ? -1 : 1) * 0.03),
          size: v / price,
          value: v,
          tx_hash: randAddr(R) + "abcdef",
        };
      });
    }
    return Array.from({ length: Math.min(limit, 25) }, (_, i) => {
      const [coin] = MK[Math.floor(R() * 8)];
      return {
        block_timestamp: iso(NOW - i * 3000),
        account: randAddr(R),
        liquidator: randAddr(R),
        market_id: MK.findIndex((m) => m[0] === coin),
        order_id: Math.round(R() * 1e9),
        tx_hash: randAddr(R) + "abcdef",
      };
    });
  }

  // wallets/...
  if (parts[0] === "wallets") {
    if (parts[1] === "search") {
      const q = (search.get("q") || "").toLowerCase().replace(/^0x/, "");
      return hotWallets(25)
        .filter((w) => w.address.toLowerCase().replace(/^0x/, "").includes(q))
        .slice(0, 8)
        .map((w) => ({
          address: w.address,
          account_id: 1000,
          equity: w.equity,
          segment_id: w.segment_id,
          segment_label: w.segment_label,
        }));
    }
    const address = parts[1];
    if (parts[2] === "fills") {
      return Array.from({ length: Math.min(limit, 25) }, (_, i) => {
        const [coin, price] = MK[Math.floor(R() * 8)];
        const buy = R() > 0.5;
        const px = price * (1 + (R() - 0.5) * 0.01);
        const val = (2 + R() * 40) * 1000;
        return {
          block_timestamp: iso(NOW - (i * 7 + Math.floor(R() * 6)) * 60_000),
          tx_hash: randAddr(R) + "abcdef",
          market_id: MK.findIndex((m) => m[0] === coin),
          side: buy ? 0 : 1,
          order_side: buy ? 0 : 1,
          order_id: Math.round(R() * 1e9),
          size: val / px,
          price: px,
          fee: val * 0.00035,
          liquidation_fee: 0,
          accumulated_funding: (R() - 0.5) * 200,
          realized_pnl: (R() - 0.4) * 4000,
          position_before: R() * 10,
          position_after: R() * 10,
          origin: "order",
        };
      });
    }
    if (parts[2] === "positions" && parts[3] === "open") {
      const defs: [string, number, number][] = [
        ["BTC", 0, 12], ["ETH", 0, 8], ["SOL", 1, 15], ["HYPE", 0, 6],
        ["ZEC", 0, 10], ["ONDO", 1, 8], ["NEAR", 0, 5],
      ];
      return defs.map(([coin, side, lev]) => {
        const [, price] = coinFor(coin);
        return onePosition(R, coin, price, marketName(coin), side, lev);
      });
    }
    if (parts[2] === "equity-history") {
      const interval = search.get("interval") || "30d";
      const cfg: Record<string, [number, number, number, number]> = {
        "24h": [48, 0.012, 0.0015, 330000],
        "7d": [84, 0.02, 0.001, 330000],
        "30d": [30, 0.035, 0.004, 250000],
        "90d": [90, 0.04, 0.006, 120000],
        all: [300, 0.05, 0.009, 44000],
      };
      const [n, vol, drift, start] = cfg[interval] || cfg["30d"];
      const stepMs =
        interval === "24h"
          ? 30 * 60_000
          : interval === "7d"
            ? 2 * 3600_000
            : 86400_000;
      const s = walk(R, start, n, vol, drift);
      return {
        address,
        interval,
        points: s.map((v, i) => ({
          t: iso(NOW - (n - 1 - i) * stepMs),
          equity: v,
          pnl: v - s[0],
          // Unrealized PnL: a noisier component oscillating around the realized line.
          upnl: (v - s[0]) * 0.35 + (R() - 0.5) * start * 0.06,
        })),
      };
    }
    if (parts[2] === "overview") {
      return {
        address,
        first_seen: iso(NOW - 320 * 86400_000),
        trades_count: 1284,
        win_rate: 0.62,
        direction_bias: 0.68,
        avg_leverage: 8.4,
        perp_equity: 248120.55,
        account_value: 248120.55,
        unrealized_pnl: 12840.0,
        all_time_pnl: 96120.0,
        roi: 0.3,
        volume_30d: 8.42e6,
        segment_id: 4,
        segment_label: "Whale",
      };
    }
  }

  // radar/...
  if (parts[0] === "radar") {
    if (parts[1] === "trending") {
      return {
        most_net_bought: {
          market: "HYPE/USDC",
          value: 8.4e6,
          detail: "+1,204 longs opened",
        },
        most_net_sold: {
          market: "ZEC/USDC",
          value: -5.1e6,
          detail: "872 shorts opened",
        },
        biggest_open: {
          market: "BTC/USDC",
          value: 4.2e6,
          account: "0x91a2c4f8b1e0a3d2c5f6079a8b1c2d3e4f5a6b7c",
          leverage: 14,
          side: 0,
        },
        most_crowded: { market: "HYPE/USDC", crowd_pct: 0.81 },
      };
    }
    if (parts[1] === "activity") {
      const acts: [string, number][] = [
        ["long_opened", 0], ["short_opened", 1], ["long_opened", 0],
        ["position_closed", 0], ["liquidated", 0], ["long_added", 0],
        ["short_opened", 1], ["realized_profit", 0], ["long_opened", 0],
        ["short_closed", 1], ["liquidated", 1], ["long_opened", 0],
      ];
      return acts.map(([action, side], i) => {
        const [coin, price] = MK[Math.floor(R() * 10)];
        const seg = SEGMENTS[Math.floor(R() * SEGMENTS.length)];
        return {
          time: iso(NOW - (i * 2 + Math.floor(R() * 3) + 1) * 1000),
          action,
          market: marketName(coin),
          side,
          leverage: Math.round(3 + R() * 22),
          notional: (50 + R() * 4000) * 1000,
          price,
          account: randAddr(R),
          segment_id: seg.id,
          segment_label: seg.label,
        };
      });
    }
  }

  return undefined;
}

function randAddr(R: () => number): string {
  let s = "0x";
  for (let i = 0; i < 40; i++) s += Math.floor(R() * 16).toString(16);
  return s;
}

function onePosition(
  R: () => number,
  coin: string,
  price: number,
  market: string,
  side: number,
  lev: number,
) {
  const dir = side === 0 ? 1 : -1;
  const entry = price * (1 - dir * (0.02 + R() * 0.06));
  const mark = price;
  const notional = (50000 + R() * 400000);
  const margin = notional / lev;
  const upnl = (dir * (mark - entry) / entry) * notional;
  const liq = side === 0 ? entry * (1 - 0.92 / lev) : entry * (1 + 0.92 / lev);
  const size = notional / mark;
  return {
    market_id: MK.findIndex((m) => m[0] === coin),
    market,
    side,
    size,
    avg_entry_price: entry,
    mark_price: mark,
    notional,
    unrealized_pnl: upnl,
    leverage: lev,
    liquidation_price: liq,
    margin,
    roe: (upnl / margin) * 100,
  };
}

function openPositions(
  R: () => number,
  coin: string,
  price: number,
  market: string,
  n: number,
) {
  return Array.from({ length: n }, () => {
    const side = R() > 0.5 ? 0 : 1;
    const lev = Math.round(2 + R() * 20);
    const p = onePosition(R, coin, price, market, side, lev);
    return { ...p, address: randAddr(R), account_id: Math.round(R() * 1e6) };
  }).sort((a, b) => b.notional - a.notional);
}

function hotWallets(n: number) {
  const tags = [
    "WHALE", "SMART MONEY", "WHALE", "TOP TRADER", "HIGH ROLLER", "WHALE",
    "CONSISTENT", "MOMENTUM", "WHALE", "SCALPER", "SWING TRADER", "WHALE",
    "EARLY LP", "SHARP",
  ];
  const out = [];
  for (let i = 0; i < n; i++) {
    const R = rng(seedFrom("hot" + i));
    const r = R();
    const vol = (190 - i * 7) * 1e6 * (0.85 + r * 0.3);
    const pnl = (R() - 0.3) * vol * 0.05;
    const eq = (9.5 - i * 0.3) * 1e6 * (0.6 + R() * 0.8);
    const seg = SEGMENTS[Math.max(0, 4 - Math.floor(i / 5))];
    out.push({
      rank: i + 1,
      address: i === 0 ? "0xfea8c4d2b1a09f8e7d6c5b4a39281706f5e4d3c2" : randAddr(R),
      equity: Math.abs(eq),
      volume: vol,
      pnl,
      win_rate: 0.5 + R() * 0.22,
      long_pct: 0.28 + R() * 0.52,
      top_market: marketName(MK[Math.floor(R() * 6)][0]),
      trades_count: Math.round(180 + R() * 2800),
      segment_id: seg.id,
      segment_label: tags[i % tags.length],
    });
  }
  return out;
}
