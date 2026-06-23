"use client";

import { useState } from "react";
import { shortAddr } from "@/lib/format";

/** Short address with a copy button (copies the full address). */
export function CopyAddress({
  address,
  showText = true,
  size = 11,
}: {
  address: string;
  showText?: boolean;
  size?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      title="Copy address"
      className="flex items-center gap-[5px] text-fg-faint transition-colors hover:text-fg-muted"
    >
      {showText ? (
        <span className="font-mono" style={{ fontSize: size }}>
          {shortAddr(address)}
        </span>
      ) : null}
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--rx-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
    </button>
  );
}
