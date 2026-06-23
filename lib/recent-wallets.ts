"use client";

import { useEffect, useState } from "react";

// Recent wallet searches, persisted in localStorage. No backend needed.

const KEY = "risex:recent-wallets";
const MAX = 5;
const EVT = "risex:recent-wallets-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentWallet(address: string) {
  if (typeof window === "undefined") return;
  const a = address.toLowerCase();
  const next = [a, ...read().filter((x) => x !== a)].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

/** Reactive list of recent wallet searches. */
export function useRecentWallets(): string[] {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}
