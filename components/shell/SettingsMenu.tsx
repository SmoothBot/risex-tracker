"use client";

import { useEffect, useRef, useState } from "react";
import { setSetting, useSettings, type Settings } from "@/lib/settings";
import { Toggle } from "@/components/ui/Toggle";

type ToggleSetting = {
  key: { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
  label: string;
  hint?: string;
};

// Add future boolean settings here — they render automatically.
const TOGGLES: ToggleSetting[] = [
  {
    key: "chartYZero",
    label: "Chart y-axis starts at zero",
    hint: "Otherwise the axis zooms to the data range.",
  },
];

export function SettingsMenu() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        aria-label="Settings"
        className={[
          "flex h-[28px] w-[28px] items-center justify-center rounded-md transition-colors hover:bg-bg-hover",
          open ? "bg-bg-hover text-fg" : "text-fg-muted",
        ].join(" ")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-30 mt-2 w-[280px] overflow-hidden rounded-md border border-border bg-bg-elevated shadow-[var(--rx-shadow-md)]">
          <div className="border-b border-border-subtle px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-fg-faint">
            SETTINGS
          </div>
          <div className="flex flex-col">
            {TOGGLES.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-3 px-3 py-[10px]">
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-[12.5px] text-fg">{t.label}</span>
                  {t.hint ? (
                    <span className="text-[10.5px] text-fg-faint">{t.hint}</span>
                  ) : null}
                </div>
                <Toggle
                  checked={settings[t.key]}
                  onChange={(v) => setSetting(t.key, v)}
                  label={t.label}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
