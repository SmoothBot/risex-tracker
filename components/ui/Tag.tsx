import type { ReactNode } from "react";

type Tone = "brand" | "up" | "down" | "info" | "warning" | "neutral";

const TONES: Record<Tone, { bg: string; color: string }> = {
  brand: { bg: "var(--rx-brand-soft)", color: "var(--rx-brand-soft-text)" },
  up: { bg: "var(--rx-up-soft)", color: "var(--rx-up)" },
  down: { bg: "var(--rx-down-soft)", color: "var(--rx-down)" },
  info: { bg: "rgba(43,127,255,.14)", color: "var(--rx-info)" },
  warning: { bg: "rgba(240,179,58,.14)", color: "var(--rx-warning)" },
  neutral: { bg: "var(--rx-bg-hover)", color: "var(--rx-fg-muted)" },
};

export function Tag({
  children,
  tone = "neutral",
  size = 10,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: number;
}) {
  const t = TONES[tone];
  return (
    <span
      className="rounded-sm font-bold"
      style={{
        fontSize: size,
        letterSpacing: ".04em",
        padding: "2px 6px",
        background: t.bg,
        color: t.color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Plain colored side label (LONG / SHORT / BUY / SELL). */
export function SideLabel({
  children,
  up,
  size = 10,
}: {
  children: ReactNode;
  up: boolean;
  size?: number;
}) {
  return (
    <span
      className="font-bold"
      style={{
        fontSize: size,
        letterSpacing: ".04em",
        color: up ? "var(--rx-up)" : "var(--rx-down)",
      }}
    >
      {children}
    </span>
  );
}
