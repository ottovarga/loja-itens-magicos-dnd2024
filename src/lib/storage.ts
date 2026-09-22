import { isFiniteNumber, isRecord, isString } from "./guards";
import type { Clock, IdSource, Shop } from "./types";

export const SHOPS_KEY = "lojinha:v1";
export const SNAPSHOTS_KEY = "lojinha:snapshots";
export const SCHEMA_VERSION = 1;
export const MAX_SNAPSHOTS = 10;
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

export type StorageError = "unavailable" | "quota" | "corrupt";
export type ParseError = "invalid_json" | "unknown_schema" | "invalid_shape";
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
export type ImportMode = "replace" | "merge";

export interface Backup {
  schemaVersion: number;
  exportedAt: string;
  shops: Shop[];
}

export interface Snapshot {
  id: string;
  createdAt: string;
  shops: Shop[];
}

function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// ---------- validação ----------

const SHOP_STRING_FIELDS = [
  "id",
  "name",
  "location",
  "kind",
  "description",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

function isShopItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.itemId) &&
    isFiniteNumber(value.qty) &&
    isFiniteNumber(value.sold) &&
    isRecord(value.priceMods) &&
    isFiniteNumber(value.priceMods.random) &&
    isFiniteNumber(value.priceMods.individual) &&
    (value.priceOverride === undefined || isFiniteNumber(value.priceOverride))
  );
}

function isNpc(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.role) &&
    isString(value.description)
  );
}

export function isShop(value: unknown): value is Shop {
  return (
    isRecord(value) &&
    SHOP_STRING_FIELDS.every((field) => isString(value[field])) &&
    Array.isArray(value.npcs) &&
    value.npcs.every(isNpc) &&
    Array.isArray(value.items) &&
    value.items.every(isShopItem) &&
    (value.lastConfig === undefined || isRecord(value.lastConfig))
  );
}

export function parseBackup(json: string): Result<Backup, ParseError> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return fail("invalid_json");
  }
  if (!isRecord(raw)) return fail("invalid_shape");
  if (raw.schemaVersion !== SCHEMA_VERSION) return fail("unknown_schema");
  if (!Array.isArray(raw.shops) || !raw.shops.every(isShop)) return fail("invalid_shape");
  return ok({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : "",
    shops: raw.shops,
  });
}

// ---------- leitura e escrita ----------

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function write(storage: Storage, key: string, value: string): Result<void, StorageError> {
  try {
    storage.setItem(key, value);
    return ok(undefined);
  } catch (error) {
    return fail(isQuotaError(error) ? "quota" : "unavailable");
  }
}

function toBackup(shops: readonly Shop[], clock: Clock): Backup {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: clock.now().toISOString(), shops: [...shops] };
}

export function loadShops(storage: Storage): Result<Shop[], StorageError> {
  let json: string | null;
  try {
    json = storage.getItem(SHOPS_KEY);
  } catch {
    return fail("unavailable");
  }
  if (json === null) return ok([]);
  const parsed = parseBackup(json);
  return parsed.ok ? ok(parsed.value.shops) : fail("corrupt");
}

export function saveShops(
  storage: Storage,
  shops: readonly Shop[],
  clock: Clock,
): Result<void, StorageError> {
  return write(storage, SHOPS_KEY, JSON.stringify(toBackup(shops, clock)));
}

// ---------- snapshots ----------

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.createdAt) &&
    Array.isArray(value.shops) &&
    value.shops.every(isShop)
  );
}

export function listSnapshots(storage: Storage): Snapshot[] {
  try {
    const raw = storage.getItem(SNAPSHOTS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSnapshot) : [];
  } catch {
    return [];
  }
}

export function createSnapshot(
  storage: Storage,
  shops: readonly Shop[],
  deps: Clock & IdSource,
): Result<void, StorageError> {
  const snapshot: Snapshot = {
    id: deps.newId(),
    createdAt: deps.now().toISOString(),
    shops: [...shops],
  };
  const next = [snapshot, ...listSnapshots(storage)].slice(0, MAX_SNAPSHOTS);
  return write(storage, SNAPSHOTS_KEY, JSON.stringify(next));
}

/** Cria snapshot se o último tiver 5 minutos ou mais. Devolve true se criou. */
export function maybeAutoSnapshot(
  storage: Storage,
  shops: readonly Shop[],
  deps: Clock & IdSource,
): boolean {
  const [latest] = listSnapshots(storage);
  if (latest && deps.now().getTime() - Date.parse(latest.createdAt) < SNAPSHOT_INTERVAL_MS) {
    return false;
  }
  return createSnapshot(storage, shops, deps).ok;
}

// ---------- backup ----------

export function exportBackup(shops: readonly Shop[], clock: Clock): string {
  return JSON.stringify(toBackup(shops, clock), null, 2);
}

export function backupFileName(clock: Clock): string {
  return `lojinha-backup-${clock.now().toISOString().slice(0, 10)}.json`;
}

// ---------- importação e restauração ----------

export function applyImport(
  current: readonly Shop[],
  imported: readonly Shop[],
  mode: ImportMode,
): Shop[] {
  if (mode === "replace") return [...imported];
  const importedById = new Map(imported.map((shop) => [shop.id, shop]));
  const currentIds = new Set(current.map((shop) => shop.id));
  return [
    ...current.map((shop) => importedById.get(shop.id) ?? shop),
    ...imported.filter((shop) => !currentIds.has(shop.id)),
  ];
}

export function importBackup(
  storage: Storage,
  current: readonly Shop[],
  json: string,
  mode: ImportMode,
  deps: Clock & IdSource,
): Result<Shop[], ParseError | StorageError> {
  const parsed = parseBackup(json);
  if (!parsed.ok) return fail(parsed.error);
  const snapshot = createSnapshot(storage, current, deps);
  if (!snapshot.ok) return fail(snapshot.error);
  const next = applyImport(current, parsed.value.shops, mode);
  const saved = saveShops(storage, next, deps);
  return saved.ok ? ok(next) : fail(saved.error);
}

export function restoreSnapshot(
  storage: Storage,
  current: readonly Shop[],
  snapshotId: string,
  deps: Clock & IdSource,
): Result<Shop[], StorageError | "not_found"> {
  const target = listSnapshots(storage).find((s) => s.id === snapshotId);
  if (!target) return fail("not_found");
  const snapshot = createSnapshot(storage, current, deps);
  if (!snapshot.ok) return fail(snapshot.error);
  const saved = saveShops(storage, target.shops, deps);
  return saved.ok ? ok(target.shops) : fail(saved.error);
}
