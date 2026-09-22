"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Rng } from "@/lib/random";
import { removeShopFromList, upsertShopInList } from "@/lib/shop";
import { loadShops, maybeAutoSnapshot, saveShops, type StorageError } from "@/lib/storage";
import type { Shop } from "@/lib/types";

export const SAVE_DELAY_MS = 500;

export interface AppDeps {
  now: () => Date;
  newId: () => string;
  rng: Rng;
}

export interface ShopsContextValue {
  shops: Shop[];
  loaded: boolean;
  error: StorageError | null;
  storage: Storage | null;
  deps: AppDeps;
  upsertShop: (shop: Shop) => void;
  deleteShop: (id: string) => void;
  /** Troca a lista inteira por dados que já foram gravados (importação, restauração). */
  replaceAll: (shops: Shop[]) => void;
}

const ShopsContext = createContext<ShopsContextValue | null>(null);

const browserDeps: AppDeps = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
  rng: Math.random,
};

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface ShopsProviderProps {
  children: ReactNode;
  /** `undefined` usa o localStorage do navegador; `null` simula storage indisponível. */
  storage?: Storage | null;
  deps?: AppDeps;
}

export function ShopsProvider({ children, storage: injected, deps = browserDeps }: ShopsProviderProps) {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);
  const dirty = useRef(false);
  const latestShops = useRef(shops);

  useEffect(() => {
    const target = injected === undefined ? browserStorage() : injected;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do localStorage
    setStorage(target);
    if (!target) {
      setError("unavailable");
    } else {
      const result = loadShops(target);
      if (result.ok) {
        latestShops.current = result.value;
        setShops(result.value);
      } else {
        setError(result.error);
      }
    }
    setLoaded(true);
  }, [injected]);

  const canSave = storage !== null && error !== "corrupt" && error !== "unavailable";

  const flush = useCallback(() => {
    if (!dirty.current || !storage || !canSave) return;
    dirty.current = false;
    const current = latestShops.current;
    const result = saveShops(storage, current, deps);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    maybeAutoSnapshot(storage, current, deps);
  }, [storage, canSave, deps]);

  useEffect(() => {
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // `shops` força o debounce a reiniciar a cada edição; `flush` sempre lê o
    // estado mais recente via `latestShops`, então não precisa mudar de identidade.
  }, [flush, shops]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const upsertShop = useCallback(
    (shop: Shop) => {
      dirty.current = true;
      const stamped = { ...shop, updatedAt: deps.now().toISOString() };
      const next = upsertShopInList(latestShops.current, stamped);
      latestShops.current = next;
      setShops(next);
    },
    [deps],
  );

  const deleteShop = useCallback((id: string) => {
    dirty.current = true;
    const next = removeShopFromList(latestShops.current, id);
    latestShops.current = next;
    setShops(next);
  }, []);

  const replaceAll = useCallback((next: Shop[]) => {
    dirty.current = false;
    latestShops.current = next;
    setShops(next);
    setError(null);
  }, []);

  const value = useMemo<ShopsContextValue>(
    () => ({ shops, loaded, error, storage, deps, upsertShop, deleteShop, replaceAll }),
    [shops, loaded, error, storage, deps, upsertShop, deleteShop, replaceAll],
  );

  return <ShopsContext.Provider value={value}>{children}</ShopsContext.Provider>;
}

export function useShops(): ShopsContextValue {
  const context = useContext(ShopsContext);
  if (!context) throw new Error("useShops precisa estar dentro de <ShopsProvider>");
  return context;
}
