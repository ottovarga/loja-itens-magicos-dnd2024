import { describe, expect, it } from "vitest";
import { defaultGenConfig, evenWeights, sanitizeConfig } from "./config";
import { ITEM_TYPES } from "./types";
import { counts, makeConfig } from "./__fixtures__/config";

describe("defaultGenConfig", () => {
  it("usa faixas de 1–3 poções e 1–5 pergaminhos", () => {
    expect(defaultGenConfig().qtyRange).toEqual({ potion: [1, 3], scroll: [1, 5] });
  });

  it("marca todos os tipos, sem pesos e sem artefatos", () => {
    const config = defaultGenConfig();
    expect(config.types).toEqual([...ITEM_TYPES]);
    expect(config.typeWeights).toBeUndefined();
    expect(config.includeArtifacts).toBe(false);
    expect(config.rarityCounts.artifact).toBe(0);
  });
});

describe("sanitizeConfig", () => {
  it("troca contagens negativas por zero e arredonda decimais", () => {
    const result = sanitizeConfig(
      makeConfig({ rarityCounts: counts({ common: -3, rare: 2.6 }) }),
    );
    expect(result.rarityCounts.common).toBe(0);
    expect(result.rarityCounts.rare).toBe(3);
  });

  it("inverte faixas de quantidade digitadas ao contrário", () => {
    const result = sanitizeConfig(
      makeConfig({ qtyRange: { potion: [4, 2], scroll: [1, 5] } }),
    );
    expect(result.qtyRange.potion).toEqual([2, 4]);
  });

  it("não aceita quantidade menor que 1", () => {
    const result = sanitizeConfig(
      makeConfig({ qtyRange: { potion: [0, 0], scroll: [-2, 3] } }),
    );
    expect(result.qtyRange).toEqual({ potion: [1, 1], scroll: [1, 3] });
  });

  it("mantém pesos só dos tipos marcados", () => {
    const result = sanitizeConfig(
      makeConfig({ types: ["weapon"], typeWeights: { weapon: 60, ring: 40 } }),
    );
    expect(result.typeWeights).toEqual({ weapon: 60 });
  });

  it("não aceita variação aleatória negativa", () => {
    expect(sanitizeConfig(makeConfig({ randomVariance: -5 })).randomVariance).toBe(0);
  });

  it("aceita percentual geral negativo (desconto)", () => {
    expect(sanitizeConfig(makeConfig({ generalMod: -20 })).generalMod).toBe(-20);
  });

  it("troca valores não numéricos por zero", () => {
    expect(sanitizeConfig(makeConfig({ generalMod: Number.NaN })).generalMod).toBe(0);
  });
});

describe("evenWeights", () => {
  it("divide 100% igualmente entre os tipos marcados", () => {
    expect(evenWeights(["weapon", "ring", "wondrous"])).toEqual({ weapon: 33, ring: 33, wondrous: 33 });
  });

  it("devolve objeto vazio sem tipos", () => {
    expect(evenWeights([])).toEqual({});
  });
});
