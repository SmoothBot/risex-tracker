"use client";

import { useEffect, useRef, useState } from "react";
import { setWalletLabel, useWalletLabel } from "@/lib/wallet-labels";

/**
 * Inline label editor for a wallet. Shows "Add label" (or a pencil when labeled),
 * opening a small popover with an input. Enter saves, Esc closes, blank removes.
 */
export function WalletLabelButton({ address }: { address: string }) {
  const label = useWalletLabel(address);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(label ?? "");
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, label]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function save() {
    setWalletLabel(address, value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={label ? "Edit label" : "Add label"}
        className="flex h-[26px] items-center gap-[6px] rounded-md border border-border px-2 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Label
      </button>

      {open ? (
        <div className="absolute top-full left-0 z-30 mt-2 w-[260px] rounded-md border border-border bg-bg-elevated p-3 shadow-[var(--rx-shadow-md)]">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-fg-faint">
            WALLET LABEL
          </span>
          <input
            ref={inputRef}
            value={value}
            maxLength={40}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="e.g. Team treasury"
            className="mt-2 h-[34px] w-full rounded-md border border-border bg-bg px-3 text-[13px] text-fg outline-none placeholder:text-fg-faint focus:border-brand"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            {label ? (
              <button
                onClick={() => {
                  setWalletLabel(address, "");
                  setOpen(false);
                }}
                className="text-[11px] font-semibold text-down transition-colors hover:opacity-80"
              >
                Remove
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="h-[28px] rounded-md px-3 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="h-[28px] rounded-md bg-brand px-3 text-[11px] font-bold text-fg-on-brand transition-colors hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
