// Number / value formatting — ported from the design mockup so the live UI
// renders numbers identically to the approved design.

export function cUSD(v: number, d = 2): string {
  return (
    "$" +
    Number(v).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
}

/** Compact USD: $1.23B / $4.56M / $7.8K / $9.01 */
export function cComp(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e9) return s + "$" + (a / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(1) + "K";
  return s + "$" + a.toFixed(2);
}

/** Signed compact USD: +$1.2M / -$340K */
export function cSg(v: number): string {
  const s = v >= 0 ? "+" : "-";
  return s + cComp(Math.abs(v)).replace("$", "$");
}

/** Signed percent from a ratio already in percent units (e.g. 12.3 → +12.30%). */
export function cPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

/** Signed percent from a 0..1 ratio (e.g. 0.123 → +12.30%). */
export function cPctRatio(v: number): string {
  return cPct(v * 100);
}

/** Price with sensible precision by magnitude. */
export function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toPrecision(2);
}

/** CSS color var for a signed value. */
export function col(v: number): string {
  return v >= 0 ? "var(--rx-up)" : "var(--rx-down)";
}

/** 0xfea8…4fd8 */
export function shortAddr(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** "3m ago" / "2h ago" / "5d ago" from an ISO/RFC3339 timestamp. */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

/** Short clock/day label for chart axes. */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return (
    ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
  );
}

/** side: 0 = long, 1 = short. */
export function sideLabel(side: number): "LONG" | "SHORT" {
  return side === 0 ? "LONG" : "SHORT";
}

/** Per-coin brand color, used for coin chips/dots. */
export const COIN_PALETTE: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#14F195",
  RISE: "#03DE82",
  HYPE: "#0BC5A0",
  BNB: "#F0B90B",
  XRP: "#7E8590",
  DOGE: "#C2A633",
  AVAX: "#E84142",
  LINK: "#2A5ADA",
  ARB: "#28A0F0",
  OP: "#FF0420",
  SUI: "#4DA2FF",
  TIA: "#9B6BF9",
  SEI: "#DD4444",
  INJ: "#00C2FF",
  PEPE: "#4FAE52",
  WIF: "#C8956B",
  TON: "#3AB0EA",
  NEAR: "#16D9A3",
  TAO: "#46C9B0",
  ZEC: "#ECB244",
  ONDO: "#2563EB",
  VVV: "#FF5C49",
  LIT: "#00B7C3",
};

export function coinColor(coin: string): string {
  return COIN_PALETTE[coin] || "#3A4046";
}

/** Deterministic conic-gradient avatar for an address/seed. */
export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `conic-gradient(from 140deg, hsl(${h} 64% 52%), hsl(${(h + 40) % 360} 54% 30%), #0C2E22, hsl(${h} 64% 52%))`;
}

/** Strip "/USDC" etc. → base symbol used for palette/labels. */
export function baseCoin(market: string): string {
  return (market || "").split(/[/\-]/)[0].toUpperCase();
}
