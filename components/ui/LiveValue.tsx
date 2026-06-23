"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Wraps a value that updates on a poll; briefly tints green/red when it moves,
 * giving a live "ticking" feel.
 */
export function LiveValue({
  value,
  children,
  className,
  style,
}: {
  value: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (value === p || !Number.isFinite(value)) return;
    setFlash(value > p ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={className}
      style={{
        ...style,
        borderRadius: 6,
        transition: "background-color 250ms ease",
        backgroundColor:
          flash === "up"
            ? "rgba(46,211,183,0.16)"
            : flash === "down"
              ? "rgba(255,100,103,0.16)"
              : "transparent",
        boxShadow:
          flash === "up"
            ? "0 0 0 3px rgba(46,211,183,0.16)"
            : flash === "down"
              ? "0 0 0 3px rgba(255,100,103,0.16)"
              : "none",
      }}
    >
      {children}
    </span>
  );
}
