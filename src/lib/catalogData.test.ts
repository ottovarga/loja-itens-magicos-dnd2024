import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalogData";
import { validateCatalog } from "./catalogValidation";
import { defaultGenConfig } from "./config";
import { generateItems } from "./generator";
import { mulberry32 } from "./random";
import { ITEM_TYPES, RARITIES } from "./types";

describe("catálogo real", () => {
  it("passa na validação", () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
  });

  it("tem itens de todas as raridades e de todos os tipos", () => {
    for (const r of RARITIES) expect(CATALOG.some((i) => i.rarity === r)).toBe(true);
    for (const t of ITEM_TYPES) expect(CATALOG.some((i) => i.type === t)).toBe(true);
  });

  it("gera a loja padrão sem faltar itens", () => {
    const result = generateItems({ catalog: CATALOG, config: defaultGenConfig(), rng: mulberry32(1) });
    expect(result.shortfalls).toEqual([]);
  });
});
