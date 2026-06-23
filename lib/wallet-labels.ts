"use client";

import { useEffect, useState } from "react";

// User-defined wallet labels, persisted in localStorage. Purely local — no
// backend. Keyed by lowercased address.

const KEY = "risex:wallet-labels";
const EVT = "risex:wallet-labels-changed";

type Labels = Record<string, string>;

function read(): Labels {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? (obj as Labels) : {};
  } catch {
    return {};
  }
}

function write(labels: Labels) {
  window.localStorage.setItem(KEY, JSON.stringify(labels));
  window.dispatchEvent(new Event(EVT));
}

/** Set (or clear, when blank) a wallet's label. */
export function setWalletLabel(address: string, label: string) {
  if (typeof window === "undefined") return;
  const a = address.toLowerCase();
  const labels = read();
  const trimmed = label.trim().slice(0, 40);
  if (trimmed) labels[a] = trimmed;
  else delete labels[a];
  write(labels);
}

export function removeWalletLabel(address: string) {
  if (typeof window === "undefined") return;
  const labels = read();
  delete labels[address.toLowerCase()];
  write(labels);
}

/** Reactive map of all labels. */
export function useWalletLabels(): Labels {
  const [labels, setLabels] = useState<Labels>({});
  useEffect(() => {
    const sync = () => setLabels(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return labels;
}

/** Reactive single label. */
export function useWalletLabel(address: string | undefined): string | undefined {
  const labels = useWalletLabels();
  return address ? labels[address.toLowerCase()] : undefined;
}
