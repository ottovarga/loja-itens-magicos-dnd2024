import { describe, expect, it } from "vitest";
import {
  SHOPS_KEY,
  SNAPSHOT_INTERVAL_MS,
  applyImport,
  backupFileName,
  createSnapshot,
  exportBackup,
  importBackup,
  listSnapshots,
  loadShops,
  maybeAutoSnapshot,
  parseBackup,
  restoreSnapshot,
  saveShops,
} from "./storage";
import { makeDeps } from "./__fixtures__/deps";
import { memoryStorage } from "./__fixtures__/memoryStorage";
import { makeShop, makeShopItem } from "./__fixtures__/shop";

const shopA = makeShop({ id: "a", name: "Loja A", items: [makeShopItem("bag-of-holding")] });
const shopB = makeShop({ id: "b", name: "Loja B" });

describe("loadShops e saveShops", () => {
  it("devolve lista vazia quando não há nada salvo", () => {
    expect(loadShops(memoryStorage())).toEqual({ ok: true, value: [] });
  });

  it("lê as lojas gravadas por saveShops", () => {
    const storage = memoryStorage();
    expect(saveShops(storage, [shopA, shopB], makeDeps()).ok).toBe(true);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA, shopB] });
  });

  it("acusa dados corrompidos sem apagá-los", () => {
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    expect(loadShops(storage)).toEqual({ ok: false, error: "corrupt" });
    expect(storage.getItem(SHOPS_KEY)).toBe("{lixo");
  });

  it("acusa storage indisponível ao carregar", () => {
    expect(loadShops(memoryStorage({ unavailable: true }))).toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("acusa armazenamento cheio ao salvar", () => {
    const result = saveShops(memoryStorage({ quotaChars: 10 }), [shopA], makeDeps());
    expect(result).toEqual({ ok: false, error: "quota" });
  });
});

describe("snapshots", () => {
  it("createSnapshot guarda o mais recente primeiro", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    createSnapshot(storage, [shopA], deps);
    createSnapshot(storage, [shopA, shopB], deps);
    const snapshots = listSnapshots(storage);
    expect(snapshots.map((s) => s.id)).toEqual(["id-2", "id-1"]);
    expect(snapshots[0].shops).toEqual([shopA, shopB]);
  });

  it("mantém no máximo 10 e descarta o mais antigo", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    for (let i = 0; i < 11; i++) createSnapshot(storage, [shopA], deps);
    const ids = listSnapshots(storage).map((s) => s.id);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe("id-11");
    expect(ids).not.toContain("id-1");
  });

  it("maybeAutoSnapshot cria o primeiro snapshot", () => {
    const storage = memoryStorage();
    expect(maybeAutoSnapshot(storage, [shopA], makeDeps())).toBe(true);
    expect(listSnapshots(storage)).toHaveLength(1);
  });

  it("maybeAutoSnapshot espera 5 minutos entre snapshots", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    maybeAutoSnapshot(storage, [shopA], deps);
    deps.advance(SNAPSHOT_INTERVAL_MS - 1000);
    expect(maybeAutoSnapshot(storage, [shopA], deps)).toBe(false);
    deps.advance(1000);
    expect(maybeAutoSnapshot(storage, [shopA], deps)).toBe(true);
    expect(listSnapshots(storage)).toHaveLength(2);
  });

  it("ignora lista de snapshots corrompida", () => {
    const storage = memoryStorage();
    storage.setItem("lojinha:snapshots", "{lixo");
    expect(listSnapshots(storage)).toEqual([]);
  });
});

describe("exportBackup e parseBackup", () => {
  it("exporta e reimporta as mesmas lojas", () => {
    const json = exportBackup([shopA, shopB], makeDeps("2026-09-22T12:00:00.000Z"));
    expect(parseBackup(json)).toEqual({
      ok: true,
      value: { schemaVersion: 1, exportedAt: "2026-09-22T12:00:00.000Z", shops: [shopA, shopB] },
    });
  });

  it("rejeita texto que não é JSON", () => {
    expect(parseBackup("{lixo")).toEqual({ ok: false, error: "invalid_json" });
  });

  it("rejeita schemaVersion desconhecido", () => {
    expect(parseBackup(JSON.stringify({ schemaVersion: 2, shops: [] }))).toEqual({
      ok: false,
      error: "unknown_schema",
    });
  });

  it("rejeita backup sem schemaVersion", () => {
    expect(parseBackup(JSON.stringify({ shops: [] }))).toEqual({
      ok: false,
      error: "unknown_schema",
    });
  });

  it("rejeita loja com formato inválido", () => {
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, shops: [{ id: 1 }] }))).toEqual({
      ok: false,
      error: "invalid_shape",
    });
  });

  it("nomeia o arquivo com a data", () => {
    expect(backupFileName(makeDeps("2026-09-22T12:00:00.000Z"))).toBe(
      "lojinha-backup-2026-09-22.json",
    );
  });
});

describe("applyImport", () => {
  it("substitui tudo no modo replace", () => {
    expect(applyImport([shopA], [shopB], "replace")).toEqual([shopB]);
  });

  it("no modo merge troca lojas de mesmo id e acrescenta as novas", () => {
    const newA = { ...shopA, name: "Loja A importada" };
    const shopC = makeShop({ id: "c" });
    expect(applyImport([shopA, shopB], [newA, shopC], "merge")).toEqual([newA, shopB, shopC]);
  });
});

describe("importBackup", () => {
  function setup() {
    const storage = memoryStorage();
    const deps = makeDeps();
    saveShops(storage, [shopA], deps);
    return { storage, deps };
  }

  it("JSON inválido não altera os dados nem cria snapshot", () => {
    const { storage, deps } = setup();
    expect(importBackup(storage, [shopA], "{lixo", "replace", deps)).toEqual({
      ok: false,
      error: "invalid_json",
    });
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA] });
    expect(listSnapshots(storage)).toEqual([]);
  });

  it("schemaVersion desconhecido não altera os dados", () => {
    const { storage, deps } = setup();
    const json = JSON.stringify({ schemaVersion: 99, shops: [] });
    expect(importBackup(storage, [shopA], json, "replace", deps).ok).toBe(false);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA] });
  });

  it("cria snapshot dos dados atuais antes de importar", () => {
    const { storage, deps } = setup();
    const json = exportBackup([shopB], deps);
    expect(importBackup(storage, [shopA], json, "replace", deps)).toEqual({
      ok: true,
      value: [shopB],
    });
    expect(listSnapshots(storage)[0].shops).toEqual([shopA]);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopB] });
  });
});

describe("restoreSnapshot", () => {
  it("cria snapshot do estado atual e restaura o escolhido", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    createSnapshot(storage, [shopB], deps); // id-1
    const result = restoreSnapshot(storage, [shopA], "id-1", deps);
    expect(result).toEqual({ ok: true, value: [shopB] });
    expect(listSnapshots(storage)[0].shops).toEqual([shopA]);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopB] });
  });

  it("avisa quando o snapshot não existe", () => {
    const storage = memoryStorage();
    expect(restoreSnapshot(storage, [shopA], "nao-existe", makeDeps())).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});
