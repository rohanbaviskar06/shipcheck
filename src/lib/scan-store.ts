import type { ScanResult } from "./scan.functions";

const KEY = "shipcheck:scans";

type Store = Record<string, ScanResult>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

export function saveScan(scan: ScanResult) {
  if (typeof window === "undefined") return;
  const store = read();
  store[scan.id] = scan;
  window.sessionStorage.setItem(KEY, JSON.stringify(store));
}

export function loadScan(id: string): ScanResult | null {
  return read()[id] ?? null;
}
