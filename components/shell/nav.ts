export type NavItem = {
  href: string;
  label: string;
  icon: string; // key into ICON map
  group: "ANALYTICS" | "MARKET";
};

export const NAV: NavItem[] = [
  { href: "/wallets", label: "Wallet", icon: "wallet", group: "ANALYTICS" },
  { href: "/perps", label: "Perps", icon: "perps", group: "ANALYTICS" },
  { href: "/radar", label: "Radar", icon: "radar", group: "ANALYTICS" },
  { href: "/cohorts", label: "Cohorts", icon: "cohorts", group: "MARKET" },
  {
    href: "/heatmap",
    label: "Position Heat Map",
    icon: "heatmap",
    group: "MARKET",
  },
  {
    href: "/liquidations",
    label: "Liquidations",
    icon: "liquidations",
    group: "MARKET",
  },
];

// Header title + subtitle per top-level route.
export const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/wallets": { title: "Wallets", sub: "Tracked addresses on RISEx" },
  "/perps": { title: "Perps", sub: "Perpetual markets" },
  "/radar": { title: "Radar", sub: "Smart-money activity, live" },
  "/cohorts": { title: "Cohorts", sub: "Trader segments by equity" },
  "/heatmap": {
    title: "Position Heat Map",
    sub: "Cohort positioning across markets",
  },
  "/liquidations": {
    title: "Liquidations",
    sub: "Liquidation flow & risk zones",
  },
};
