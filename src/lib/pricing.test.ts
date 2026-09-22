import { describe, expect, it } from "vitest";
import { basePrice, finalPrice, formatGp } from "./pricing";
import type { Rarity } from "./types";

const noMods = { priceMods: { random: 0, individual: 0 } };

describe("basePrice", () => {
  it.each<[Rarity, number]>([
    ["common", 100],
    ["uncommon", 400],
    ["rare", 4000],
    ["very_rare", 40000],
    ["legendary", 200000],
  ])("item %s custa %i PO", (rarity, expected) => {
    expect(basePrice({ rarity, consumable: false })).toBe(expected);
  });

  it("poções e pergaminhos custam metade do preço base", () => {
    expect(basePrice({ rarity: "rare", consumable: true })).toBe(2000);
  });

  it("artefato não tem preço base", () => {
    expect(basePrice({ rarity: "artifact", consumable: false })).toBeNull();
  });
});

describe("finalPrice", () => {
  const rare = { rarity: "rare" as const, consumable: false };

  it("sem percentuais devolve o preço base", () => {
    expect(finalPrice(rare, noMods, 0)).toBe(4000);
  });

  it.each([
    // random, geral, individual, esperado
    [10, 0, 0, 4400],
    [0, -25, 0, 3000],
    [0, 0, 50, 6000],
    [10, 10, 10, 5324],
    [-10, 20, -5, 4104],
  ])(
    "compõe random %i%%, geral %i%% e individual %i%% em %i PO",
    (random, general, individual, expected) => {
      expect(
        finalPrice(rare, { priceMods: { random, individual } }, general),
      ).toBe(expected);
    },
  );

  it("arredonda para PO inteiro", () => {
    const common = { rarity: "common" as const, consumable: true };
    expect(
      finalPrice(common, { priceMods: { random: 3, individual: 0 } }, 0),
    ).toBe(52);
  });

  it("priceOverride substitui todo o cálculo", () => {
    expect(
      finalPrice(
        rare,
        { priceMods: { random: 10, individual: 10 }, priceOverride: 123 },
        50,
      ),
    ).toBe(123);
  });

  it("artefato sem priceOverride não tem preço", () => {
    const artifact = { rarity: "artifact" as const, consumable: false };
    expect(
      finalPrice(artifact, { priceMods: { random: 0, individual: 50 } }, 50),
    ).toBeNull();
  });

  it("artefato com priceOverride usa o valor manual sem percentuais", () => {
    const artifact = { rarity: "artifact" as const, consumable: false };
    expect(
      finalPrice(
        artifact,
        { priceMods: { random: 0, individual: 50 }, priceOverride: 900000 },
        50,
      ),
    ).toBe(900000);
  });

  it("nunca fica negativo", () => {
    expect(
      finalPrice(rare, { priceMods: { random: 0, individual: -150 } }, 0),
    ).toBe(0);
  });
});

describe("formatGp", () => {
  it("usa separador de milhar pt-BR e sufixo PO", () => {
    expect(formatGp(40000)).toBe("40.000 PO");
  });

  it("mostra travessão quando não há preço", () => {
    expect(formatGp(null)).toBe("—");
  });
});
