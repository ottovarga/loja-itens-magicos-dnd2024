import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import { describeShortfalls, generateItems } from "./generator";
import { mulberry32, type Rng } from "./random";
import type { GenConfig, Rarity, ShopItem } from "./types";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { counts, makeConfig } from "./__fixtures__/config";
import { seq } from "./__fixtures__/rng";

const index = indexCatalog(fixtureCatalog);
const info = (s: ShopItem) => index.get(s.itemId)!;
const ofRarity = (items: ShopItem[], rarity: Rarity) =>
  items.filter((s) => info(s).rarity === rarity);
const totalQty = (items: ShopItem[]) => items.reduce((sum, s) => sum + s.qty, 0);

function run(
  config: GenConfig,
  opts: { existing?: ShopItem[]; rng?: Rng } = {},
) {
  return generateItems({
    catalog: fixtureCatalog,
    config,
    existing: opts.existing,
    rng: opts.rng ?? mulberry32(1),
  });
}

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("generateItems — contagem e tipos", () => {
  it("gera a quantidade pedida de cada raridade", () => {
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 2, rare: 1 }) }));
    expect(ofRarity(items, "common")).toHaveLength(2);
    expect(ofRarity(items, "rare")).toHaveLength(1);
    expect(items).toHaveLength(3);
  });

  it("só sorteia itens dos tipos marcados", () => {
    for (const seed of SEEDS) {
      const { items } = run(
        makeConfig({ rarityCounts: counts({ common: 2, uncommon: 2 }), types: ["wondrous"] }),
        { rng: mulberry32(seed) },
      );
      expect(items.every((s) => info(s).type === "wondrous")).toBe(true);
    }
  });
});

describe("generateItems — lista existente e falta de itens", () => {
  it("preserva os itens que já estavam na loja", () => {
    const existing: ShopItem[] = [
      { itemId: "legendary-weapon", qty: 1, priceMods: { random: 5, individual: 0 }, sold: 0 },
    ];
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 1 }) }), { existing });
    expect(items[0]).toEqual(existing[0]);
    expect(items).toHaveLength(2);
  });

  it("gera o possível e avisa quando não há itens elegíveis, sem lançar erro", () => {
    const result = run(makeConfig({ rarityCounts: counts({ common: 2 }), types: ["ring"] }));
    expect(result.items).toEqual([]);
    expect(result.shortfalls).toEqual([{ rarity: "common", requested: 2, generated: 0 }]);
  });
});

describe("generateItems — allowRepeat desligado", () => {
  it("não repete itens quando allowRepeat está desligado", () => {
    for (const seed of SEEDS) {
      const { items } = run(makeConfig({ rarityCounts: counts({ uncommon: 4 }) }), {
        rng: mulberry32(seed),
      });
      expect(new Set(items.map((s) => s.itemId)).size).toBe(4);
    }
  });

  it("não repete itens que já estão na loja ao acrescentar", () => {
    const existing: ShopItem[] = [
      { itemId: "common-wondrous-1", qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 },
    ];
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"] }),
      { existing, rng: seq(0) },
    );
    expect(items.map((s) => s.itemId)).toEqual(["common-wondrous-1", "common-wondrous-2"]);
  });

  it("avisa quantos faltaram quando o pool se esgota", () => {
    const result = run(makeConfig({ rarityCounts: counts({ rare: 3 }), types: ["armor"] }));
    expect(result.items).toHaveLength(1);
    expect(result.shortfalls).toEqual([{ rarity: "rare", requested: 3, generated: 1 }]);
  });
});

describe("generateItems — allowRepeat ligado", () => {
  it("soma a quantidade quando o item se repete", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 3 }), types: ["wondrous"], allowRepeat: true }),
      { rng: seq(0) },
    );
    expect(items).toEqual([
      { itemId: "common-wondrous-1", qty: 3, priceMods: { random: 0, individual: 0 }, sold: 0 },
    ]);
  });

  it("soma na linha existente da loja sem alterar a lista recebida", () => {
    const existing: ShopItem[] = [
      { itemId: "common-wondrous-1", qty: 2, priceMods: { random: 0, individual: 0 }, sold: 1 },
    ];
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"], allowRepeat: true }),
      { existing, rng: seq(0) },
    );
    expect(items).toEqual([{ ...existing[0], qty: 3 }]);
    expect(existing[0].qty).toBe(2);
  });
});

describe("generateItems — quantidade de consumíveis", () => {
  const potionConfig = (range: [number, number]) =>
    makeConfig({
      rarityCounts: counts({ common: 1 }),
      types: ["potion"],
      qtyRange: { potion: range, scroll: [1, 1] },
    });

  it("poção recebe o mínimo da faixa quando o rng devolve 0", () => {
    const { items } = run(potionConfig([2, 4]), { rng: seq(0, 0) });
    expect(items[0].qty).toBe(2);
  });

  it("poção recebe o máximo da faixa quando o rng devolve quase 1", () => {
    const { items } = run(potionConfig([2, 4]), { rng: seq(0, 0.9999) });
    expect(items[0].qty).toBe(4);
  });

  it("pergaminho usa a faixa de pergaminhos", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ common: 1 }),
        types: ["scroll"],
        qtyRange: { potion: [1, 1], scroll: [5, 5] },
      }),
    );
    expect(items[0].qty).toBe(5);
  });

  it("outros itens entram com quantidade 1", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ common: 2 }),
        types: ["wondrous"],
        qtyRange: { potion: [3, 3], scroll: [3, 3] },
      }),
    );
    expect(items.every((s) => s.qty === 1)).toBe(true);
  });
});

describe("generateItems — variação aleatória de preço", () => {
  const wondrous = (variance: number) =>
    makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"], randomVariance: variance });

  it("fica em zero quando a variação está desligada", () => {
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 2, rare: 2 }) }));
    expect(items.every((s) => s.priceMods.random === 0)).toBe(true);
  });

  it("chega a -v quando o rng devolve 0", () => {
    const { items } = run(wondrous(10), { rng: seq(0, 0) });
    expect(items[0].priceMods.random).toBe(-10);
  });

  it("chega a +v quando o rng devolve quase 1", () => {
    const { items } = run(wondrous(10), { rng: seq(0, 0.9999) });
    expect(items[0].priceMods.random).toBe(10);
  });

  it("é sempre inteiro entre -v e +v", () => {
    for (const seed of SEEDS) {
      const { items } = run(
        makeConfig({ rarityCounts: counts({ common: 4, uncommon: 4, rare: 2 }), randomVariance: 15 }),
        { rng: mulberry32(seed) },
      );
      for (const s of items) {
        expect(Number.isInteger(s.priceMods.random)).toBe(true);
        expect(Math.abs(s.priceMods.random)).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe("generateItems — artefatos", () => {
  it("deixa artefatos fora do sorteio por padrão, sem aviso", () => {
    const result = run(makeConfig({ rarityCounts: counts({ artifact: 2 }) }));
    expect(result.items).toEqual([]);
    expect(result.shortfalls).toEqual([]);
  });

  it("sorteia artefatos com includeArtifacts", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ artifact: 2 }), includeArtifacts: true }),
    );
    expect(ofRarity(items, "artifact")).toHaveLength(2);
  });

  it("artefatos não recebem variação aleatória de preço", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ artifact: 2 }), includeArtifacts: true, randomVariance: 20 }),
      { rng: seq(0) },
    );
    expect(items.every((s) => s.priceMods.random === 0)).toBe(true);
  });
});

describe("generateItems — typeWeights", () => {
  it("sem typeWeights sorteia de forma uniforme entre os itens elegíveis", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ uncommon: 4000 }), allowRepeat: true }),
      { rng: mulberry32(42) },
    );
    expect(items).toHaveLength(4);
    for (const s of items) {
      expect(s.qty).toBeGreaterThan(900);
      expect(s.qty).toBeLessThan(1100);
    }
  });

  it("só sorteia tipos com peso positivo", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 20 }),
        allowRepeat: true,
        typeWeights: { weapon: 100, wondrous: 0 },
      }),
    );
    expect(items.map((s) => s.itemId)).toEqual(["weapon-plus-1"]);
  });

  it("ignora tipo sem itens na raridade", () => {
    const result = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 5 }),
        allowRepeat: true,
        typeWeights: { ring: 90, weapon: 10 },
      }),
    );
    expect(result.items.map((s) => s.itemId)).toEqual(["weapon-plus-1"]);
    expect(result.shortfalls).toEqual([]);
  });

  it("aproxima o percentual pedido", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 2000 }),
        allowRepeat: true,
        typeWeights: { weapon: 50, wondrous: 50 },
      }),
      { rng: mulberry32(42) },
    );
    const weapons = totalQty(items.filter((s) => info(s).type === "weapon"));
    expect(weapons / totalQty(items)).toBeGreaterThan(0.45);
    expect(weapons / totalQty(items)).toBeLessThan(0.55);
  });

  it("avisa falta quando só sobram tipos sem peso", () => {
    const result = run(
      makeConfig({ rarityCounts: counts({ uncommon: 3 }), typeWeights: { weapon: 100 } }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.shortfalls).toEqual([{ rarity: "uncommon", requested: 3, generated: 1 }]);
  });
});

describe("describeShortfalls", () => {
  it("descreve quantos itens de cada raridade foram gerados", () => {
    expect(describeShortfalls([{ rarity: "rare", requested: 5, generated: 2 }])).toEqual([
      "Só 2 de 5 Raro disponíveis com esses filtros.",
    ]);
  });
});
