"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVolumeLeaders, useWalletSearch } from "@/lib/api/hooks";
import { addRecentWallet, useRecentWallets } from "@/lib/recent-wallets";
import { useWalletLabels } from "@/lib/wallet-labels";
import { avatarGradient } from "@/lib/format";
import { SearchIcon } from "./icons";
import { WalletName } from "@/components/ui/WalletName";

type Suggestion = {
  address: string;
  kind: "recent" | "top" | "search" | "label";
  label?: string;
};

const FULL_ADDR = /^0x[a-f0-9]{40}$/;

export function AddressSearch({
  variant = "header",
}: {
  variant?: "header" | "hero";
}) {
  const router = useRouter();
  const recent = useRecentWallets();
  const labels = useWalletLabels();
  const leaders = useVolumeLeaders("30d");
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useWalletSearch(value);

  const top = useMemo<Suggestion[]>(
    () =>
      (leaders.data ?? []).slice(0, 5).map((w) => ({
        address: w.address,
        kind: "top" as const,
        label: w.segment_label ?? undefined,
      })),
    [leaders.data],
  );

  const recentSug = useMemo<Suggestion[]>(
    () => recent.slice(0, 5).map((a) => ({ address: a, kind: "recent" as const })),
    [recent],
  );

  // Suggestions:
  //   • empty query → recent then top (deduped);
  //   • typing → user-label matches + client matches from recent/top (instant) +
  //     full-universe results from the search API (gap #12), deduped, capped.
  const suggestions = useMemo<Suggestion[]>(() => {
    const raw = value.trim().toLowerCase();
    const q = raw.replace(/^0x/, "");
    const seen = new Set<string>();
    const push = (out: Suggestion[], s: Suggestion) => {
      if (seen.has(s.address)) return;
      seen.add(s.address);
      out.push(s);
    };
    if (!raw) {
      const out: Suggestion[] = [];
      for (const s of [...recentSug, ...top]) push(out, s);
      return out;
    }
    const out: Suggestion[] = [];
    // User-labeled wallets whose label matches — strongest intent, shown first.
    for (const [addr, label] of Object.entries(labels)) {
      if (label.toLowerCase().includes(raw)) {
        push(out, { address: addr, kind: "label", label });
      }
    }
    // Instant client-side matches from recent/top (by address or segment tag).
    for (const s of [...recentSug, ...top]) {
      const hay = s.address.toLowerCase().replace(/^0x/, "");
      if (hay.includes(q) || (s.label?.toLowerCase().includes(raw) ?? false)) {
        push(out, s);
      }
    }
    // Then full-universe results from the search endpoint.
    for (const r of search.data ?? []) {
      push(out, {
        address: r.address,
        kind: "search",
        label: r.segment_label ?? undefined,
      });
    }
    return out.slice(0, 8);
  }, [value, recentSug, top, search.data, labels]);

  // A complete address typed that isn't already in the list → offer it directly.
  const typedAddr = value.trim().toLowerCase();
  const directItem: Suggestion | null =
    FULL_ADDR.test(typedAddr) && !suggestions.some((s) => s.address === typedAddr)
      ? { address: typedAddr, kind: "recent" }
      : null;

  const items = directItem ? [directItem, ...suggestions] : suggestions;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(address: string) {
    if (!FULL_ADDR.test(address)) return;
    addRecentWallet(address);
    setValue("");
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(`/wallets/${address}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].address);
      else if (FULL_ADDR.test(typedAddr)) go(typedAddr);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const isHero = variant === "hero";

  const dropdown =
    open && items.length > 0 ? (
      <div
        className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-md border border-border bg-bg-elevated py-1 shadow-[var(--rx-shadow-md)]"
        role="listbox"
      >
        {items.map((s, i) => {
          const isRecent = s.kind === "recent" && !(directItem && i === 0);
          const isDirect = directItem != null && i === 0;
          const prev = items[i - 1];
          const showHeader =
            !isDirect && (i === 0 || prev?.kind !== s.kind || (directItem && i === 1));
          return (
            <div key={s.address + i}>
              {showHeader ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-fg-faint">
                  {s.kind === "recent"
                    ? "RECENT"
                    : s.kind === "label"
                      ? "LABELED"
                      : s.kind === "search"
                        ? "RESULTS"
                        : "TOP WALLETS"}
                </div>
              ) : null}
              <button
                type="button"
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(s.address);
                }}
                className={[
                  "flex w-full items-center gap-[10px] px-3 py-2 text-left transition-colors",
                  active === i ? "bg-bg-hover" : "bg-transparent",
                ].join(" ")}
              >
                <span
                  className="h-[22px] w-[22px] flex-none rounded-[6px]"
                  style={{ background: avatarGradient(s.address) }}
                />
                <span className="min-w-0 flex-1">
                  <WalletName address={s.address} size={12.5} />
                </span>
                {isDirect ? (
                  <span className="text-[10px] text-fg-faint">Open</span>
                ) : s.kind !== "label" && s.label ? (
                  <span className="text-[10px] font-bold tracking-[0.03em] text-brand-soft-text">
                    {s.label}
                  </span>
                ) : isRecent ? (
                  <RecentClock />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    ) : null;

  if (isHero) {
    return (
      <div ref={rootRef} className="relative w-full max-w-[640px]">
        <div className="flex gap-2">
          <label className="flex h-[44px] flex-1 items-center gap-[10px] rounded-md border border-border bg-bg px-[14px]">
            <span className="text-fg-faint">
              <SearchIcon size={17} />
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="0x0000000000000000000000000000000000000000"
              spellCheck={false}
              className="w-full border-none bg-transparent font-mono text-[13px] text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (active >= 0 && items[active]) go(items[active].address);
              else if (FULL_ADDR.test(typedAddr)) go(typedAddr);
            }}
            className="h-[44px] flex-none cursor-pointer rounded-md bg-brand px-[22px] text-[13px] font-bold text-fg-on-brand transition-colors hover:bg-brand-hover"
            style={{ boxShadow: "var(--rx-shadow-cta)" }}
          >
            Track Wallet
          </button>
        </div>
        {dropdown}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-[340px]">
      <label className="flex h-[38px] items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-3">
        <span className="text-fg-faint">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search address (0x…)"
          spellCheck={false}
          className="w-full border-none bg-transparent font-mono text-[12px] text-fg-strong outline-none placeholder:text-fg-faint"
        />
        <span className="rounded-sm border border-border px-[5px] py-[2px] font-mono text-[10px] text-fg-faint">
          /
        </span>
      </label>
      {dropdown}
    </div>
  );
}

function RecentClock() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--rx-fg-faint)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
