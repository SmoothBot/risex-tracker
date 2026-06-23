"use client";

import { useEffect, useState } from "react";

// User preferences, persisted in localStorage. Add new keys to `Settings` +
// `DEFAULTS` and they're automatically available via useSetting/useSettings.

export type Settings = {
  /** Force the chart y-axis to include zero (vs. zooming to the data range). */
  chartYZero: boolean;
};

export const DEFAULTS: Settings = {
  chartYZero: false,
};

const KEY = "risex:settings";
const EVT = "risex:settings-changed";

function read(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return DEFAULTS;
  }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  if (typeof window === "undefined") return;
  const next = { ...read(), [key]: value };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    const sync = () => setSettings(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return settings;
}

export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useSettings()[key];
}
