"use client";

import { useEffect, useState } from "react";

/**
 * Centered RISEx loading animation overlaid on a chart. Only appears if loading
 * lasts longer than `delay` (so fast loads don't flash), and fades in/out.
 */
export function ChartLoadingOverlay({
  loading,
  delay = 350,
}: {
  loading: boolean;
  delay?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [loading, delay]);

  return (
    <div
      aria-hidden={!show}
      className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out"
      style={{ opacity: show ? 1 : 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/rise-loading.gif" alt="Loading" width={64} height={64} />
    </div>
  );
}
