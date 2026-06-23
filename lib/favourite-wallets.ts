"use client";

import { useEffect, useState } from "react";

// Favourited wallets, persisted in localStorage (newest first). No backend.

const KEY = "risex:favourite-wallets";
const EVT = "risex:favourite-wallets-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function toggleFavourite(address: string) {
  if (typeof window === "undefined") return;
  const a = address.toLowerCase();
  const list = read();
  write(list.includes(a) ? list.filter((x) => x !== a) : [a, ...list]);
}

export function useFavouriteWallets(): string[] {
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

export function useIsFavourite(address: string | undefined): boolean {
  const list = useFavouriteWallets();
  return address ? list.includes(address.toLowerCase()) : false;
}
