"use client";

import { useEffect, useRef, useState } from "react";
import { cComp, cUSD } from "@/lib/format";

export type TimePoint = { t: number; v: number };

type Scale = { x0: number; x1: number; y0: number; y1: number };

function scaleFrom(
  primary: TimePoint[],
  secondary: TimePoint[] | undefined,
  x0: number,
  x1: number,
  fromZero = false,
): Scale {
  const vals = [
    ...primary.map((p) => p.v),
    ...(secondary ? secondary.map((p) => p.v) : []),
  ];
  let y0 = vals.length ? Math.min(...vals) : 0;
  let y1 = vals.length ? Math.max(...vals) : 1;
  if (fromZero) {
    y0 = Math.min(0, y0);
    y1 = Math.max(0, y1);
  }
  if (y0 === y1) {
    const pad = Math.abs(y0) * 0.01 || 1;
    y0 -= pad;
    y1 += pad;
  }
  return { x0, x1: Math.max(x1, x0 + 1), y0, y1 };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpScale = (a: Scale, b: Scale, k: number): Scale => ({
  x0: lerp(a.x0, b.x0, k),
  x1: lerp(a.x1, b.x1, k),
  y0: lerp(a.y0, b.y0, k),
  y1: lerp(a.y1, b.y1, k),
});
const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

const DURATION = 480;

/**
 * Time-aware area chart with animated range/metric changes. Supports a primary
 * series (solid line + area) and an optional `secondary` series (dotted, drawn
 * behind, no fill). The y-scale spans both. An optional zero line is drawn when
 * the value range crosses zero (useful for PnL).
 */
export function AreaChart({
  points,
  secondary,
  domainStart,
  domainEnd,
  formatTick,
  zeroLine = false,
  yFromZero = false,
  primaryLabel,
  secondaryLabel,
  transitionKey,
  height = 270,
}: {
  points: TimePoint[];
  secondary?: TimePoint[];
  domainStart: number;
  domainEnd: number;
  formatTick: (t: number) => string;
  zeroLine?: boolean;
  yFromZero?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** When this changes (e.g. metric), the chart crossfades instead of zooming. */
  transitionKey?: string;
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState(-1);

  // Measure the container so the chart fills any width 1:1 (no scaling/distortion),
  // and reflows when the sidebar collapses/expands.
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(920);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw && cw > 0) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ht = height;
  const pl = 12;
  const pr = 58;
  const pt = 18;
  const pb = 34;

  const domRef = useRef({ domainStart, domainEnd });
  domRef.current = { domainStart, domainEnd };
  const secRef = useRef(secondary);
  secRef.current = secondary;

  const [view, setView] = useState<{
    pts: TimePoint[];
    sec?: TimePoint[];
    scale: Scale;
    opacity: number;
  }>(() => ({
    pts: points,
    sec: secondary,
    scale: scaleFrom(points, secondary, domainStart, domainEnd, yFromZero),
    opacity: 1,
  }));
  const viewRef = useRef(view);
  viewRef.current = view;

  const rafRef = useRef(0);
  const keyRef = useRef(transitionKey);
  const tipSideRef = useRef<"top" | "bottom">("top");

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const target = scaleFrom(
      points,
      secRef.current,
      domRef.current.domainStart,
      domRef.current.domainEnd,
      yFromZero,
    );
    const from = viewRef.current.scale;
    const heldPts = viewRef.current.pts;
    const heldSec = viewRef.current.sec;

    const prevKey = keyRef.current;
    keyRef.current = transitionKey;

    if (heldPts.length === 0) {
      setView({ pts: points, sec: secRef.current, scale: target, opacity: 1 });
      return;
    }

    // Metric switch (different chart entirely) → crossfade out, swap, fade in.
    if (transitionKey !== prevKey) {
      const FADE = 170;
      const startOut = performance.now();
      const fadeOut = (now: number) => {
        const e = Math.min(1, (now - startOut) / FADE);
        setView({ pts: heldPts, sec: heldSec, scale: from, opacity: 1 - e });
        if (e < 1) {
          rafRef.current = requestAnimationFrame(fadeOut);
        } else {
          const startIn = performance.now();
          const fadeIn = (n2: number) => {
            const e2 = Math.min(1, (n2 - startIn) / FADE);
            setView({ pts: points, sec: secRef.current, scale: target, opacity: e2 });
            if (e2 < 1) rafRef.current = requestAnimationFrame(fadeIn);
          };
          rafRef.current = requestAnimationFrame(fadeIn);
        }
      };
      rafRef.current = requestAnimationFrame(fadeOut);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Same metric, new range/data → zoom the axis between scales.
    const start = performance.now();
    const tick = (now: number) => {
      const e = Math.min(1, (now - start) / DURATION);
      const k = easeInOut(e);
      if (e < 1) {
        setView({ pts: heldPts, sec: heldSec, scale: lerpScale(from, target, k), opacity: 1 });
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setView({ pts: points, sec: secRef.current, scale: target, opacity: 1 });
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, secondary, yFromZero, transitionKey]);

  const { pts, sec, scale, opacity } = view;

  if (!pts || pts.length < 1) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center text-[12px] text-fg-faint"
        style={{ height: ht, width: "100%" }}
      >
        No data for this range.
      </div>
    );
  }

  const xSpan = Math.max(1, scale.x1 - scale.x0);
  const ySpan = scale.y1 - scale.y0 || 1;
  const X = (t: number) => pl + ((t - scale.x0) / xSpan) * (w - pl - pr);
  const Y = (v: number) => pt + (1 - (v - scale.y0) / ySpan) * (ht - pt - pb);

  const vals = pts.map((p) => p.v);
  const up = vals[vals.length - 1] >= vals[0];
  const c = up ? "#03DE82" : "#FB2C36";
  const axisY = ht - pb;

  const pathOf = (arr: TimePoint[]) => {
    let d = "";
    arr.forEach((p, i) => {
      d += (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1) + " ";
    });
    return d;
  };

  const line = pathOf(pts);
  const area =
    pts.length > 1
      ? line +
        `L${X(pts[pts.length - 1].t).toFixed(1)} ${axisY} L${X(pts[0].t).toFixed(1)} ${axisY} Z`
      : "";
  const secLine = sec && sec.length > 1 ? pathOf(sec) : "";

  const grid = [];
  for (let g = 0; g <= 3; g++) {
    const yy = pt + (g * (ht - pt - pb)) / 3;
    const vv = scale.y1 - (g * ySpan) / 3;
    grid.push(
      <g key={`h${g}`}>
        <line x1={pl} x2={w - pr} y1={yy} y2={yy} stroke="rgba(255,255,255,0.05)" />
        <text x={w - pr + 8} y={yy + 3} fill="#61656C" fontSize={9.5} fontFamily="var(--rx-font-mono)">
          {cComp(vv)}
        </text>
      </g>,
    );
  }

  const TICKS = 5;
  const xTicks = [];
  for (let i = 0; i < TICKS; i++) {
    const t = scale.x0 + (i / (TICKS - 1)) * xSpan;
    const x = X(t);
    const anchor = i === 0 ? "start" : i === TICKS - 1 ? "end" : "middle";
    xTicks.push(
      <g key={`x${i}`}>
        <line x1={x} x2={x} y1={pt} y2={axisY} stroke="rgba(255,255,255,0.04)" />
        <text x={x} y={axisY + 16} textAnchor={anchor} fill="#61656C" fontSize={9.5} fontFamily="var(--rx-font-mono)">
          {formatTick(t)}
        </text>
      </g>,
    );
  }

  // Zero reference line (PnL).
  const showZero = zeroLine && scale.y0 < 0 && scale.y1 > 0;
  const zeroY = showZero ? Y(0) : 0;

  const hi = hoverIdx;
  let hover = null;
  let tip = null;
  if (hi >= 0 && hi < pts.length) {
    const p = pts[hi];
    // Secondary value at the hovered time (series share buckets).
    let secV: number | null = null;
    if (sec && sec.length) {
      let best = -1;
      let bd = Infinity;
      sec.forEach((s, i) => {
        const d = Math.abs(s.t - p.t);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0) secV = sec[best].v;
    }

    const rows: { label: string; value: number; color: string; dashed: boolean }[] = [
      { label: primaryLabel ?? "Value", value: p.v, color: c, dashed: false },
    ];
    if (secV != null) {
      rows.push({
        label: secondaryLabel ?? "",
        value: secV,
        color: "#94979C",
        dashed: true,
      });
    }

    const hx = X(p.t);
    hover = (
      <g>
        <line x1={hx} x2={hx} y1={pt} y2={axisY} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        {secV != null ? (
          <circle cx={hx} cy={Y(secV)} r={3.5} fill="#94979C" stroke="#0C0E12" strokeWidth={2} />
        ) : null}
        <circle cx={hx} cy={Y(p.v)} r={4} fill={c} stroke="#0C0E12" strokeWidth={2} />
      </g>
    );

    // Tooltip box, sized to its rows.
    const boxW = 168;
    const headerH = 18;
    const rowH = 16;
    const boxH = headerH + rows.length * rowH + 8;

    // Vertical: place opposite the hovered point so it doesn't sit on the line.
    // Hysteresis (deadband) around mid-height avoids flicker when the line
    // wanders near 50%.
    const plotMid = pt + (axisY - pt) / 2;
    const dead = (axisY - pt) * 0.15;
    const py = Y(p.v);
    if (py > plotMid + dead) tipSideRef.current = "top";
    else if (py < plotMid - dead) tipSideRef.current = "bottom";
    const boxY = tipSideRef.current === "top" ? pt + 6 : axisY - boxH - 6;
    // Horizontal: bias to the side of the cursor with more room, clamped.
    const boxX =
      hx < (pl + (w - pr)) / 2
        ? Math.min(hx + 14, w - pr - boxW)
        : Math.max(hx - boxW - 14, pl);

    const d = new Date(p.t);
    const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
    const hh = ("0" + d.getHours()).slice(-2);
    const mm = ("0" + d.getMinutes()).slice(-2);
    const dateTime = `${mon} ${d.getDate()}, ${hh}:${mm}`;

    tip = (
      <g transform={`translate(${boxX},${boxY})`}>
        <rect width={boxW} height={boxH} rx={6} fill="#22262F" stroke="rgba(255,255,255,0.12)" />
        <text x={10} y={13} fill="#94979C" fontSize={9.5} fontFamily="var(--rx-font-body)">
          {dateTime}
        </text>
        {rows.map((r, i) => {
          const ry = headerH + i * rowH + 9;
          return (
            <g key={i}>
              <line
                x1={10}
                x2={22}
                y1={ry}
                y2={ry}
                stroke={r.color}
                strokeWidth={2}
                strokeDasharray={r.dashed ? "2 2" : undefined}
                strokeLinecap="round"
              />
              <text x={28} y={ry + 3.5} fill="#94979C" fontSize={10} fontFamily="var(--rx-font-body)">
                {r.label}
              </text>
              <text
                x={boxW - 10}
                y={ry + 3.5}
                textAnchor="end"
                fill="#fff"
                fontSize={11}
                fontWeight={600}
                fontFamily="var(--rx-font-mono)"
              >
                {cUSD(r.value, 0)}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w;
    const tHover = scale.x0 + ((x - pl) / (w - pl - pr)) * xSpan;
    let best = -1;
    let bestD = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.t - tHover);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== hoverIdx) setHoverIdx(best);
  }

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
    <svg
      viewBox={`0 0 ${w} ${ht}`}
      width="100%"
      height={ht}
      style={{ display: "block", cursor: "crosshair" }}
      onMouseMove={onMove}
      onMouseLeave={() => hoverIdx !== -1 && setHoverIdx(-1)}
    >
      <defs>
        <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.28} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g opacity={opacity}>
        {grid}
        {xTicks}
        <line x1={pl} x2={w - pr} y1={axisY} y2={axisY} stroke="rgba(255,255,255,0.12)" />
        {showZero ? (
          <line x1={pl} x2={w - pr} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.22)" strokeDasharray="2 3" />
        ) : null}
        {/* Secondary series (dotted, behind). */}
        {secLine ? (
          <path
            d={secLine}
            fill="none"
            stroke="#94979C"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
        ) : null}
        {area ? <path d={area} fill="url(#eqg)" /> : null}
        <path d={line} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(pts[pts.length - 1].t)} cy={Y(vals[vals.length - 1])} r={3.5} fill={c} />
        {hover}
        {tip}
      </g>
    </svg>
    </div>
  );
}
