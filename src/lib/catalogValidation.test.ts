import { describe, expect, it } from "vitest";
import { validateCatalog } from "./catalogValidation";
import { fixtureCatalog } from "./__fixtures__/catalog";

const valid = fixtureCatalog[0];

describe("validateCatalog", () => {
  it("aceita um catálogo correto", () => {
    expect(validateCatalog(fixtureCatalog)).toEqual([]);
  });

  it("acusa tipo inválido", () => {
    expect(validateCatalog([{ ...valid, type: "shield" }])).toEqual([
      'potion-of-healing: tipo inválido "shield"',
    ]);
  });

  it("acusa raridade inválida", () => {
    expect(validateCatalog([{ ...valid, rarity: "epic" }])).toEqual([
      'potion-of-healing: raridade inválida "epic"',
    ]);
  });

  it("acusa nome em português vazio", () => {
    expect(validateCatalog([{ ...valid, namePt: " " }])).toEqual([
      "potion-of-healing: nome em português vazio",
    ]);
  });

  it("acusa id repetido", () => {
    expect(validateCatalog([valid, valid])).toEqual(["potion-of-healing: id repetido"]);
  });

  it("acusa consumable diferente do tipo", () => {
    expect(validateCatalog([{ ...valid, consumable: false }])).toEqual([
      "potion-of-healing: consumable deve ser true",
    ]);
  });

  it("acusa URL fora do AideDD", () => {
    expect(validateCatalog([{ ...valid, url: "https://example.com/x" }])).toEqual([
      "potion-of-healing: URL fora do AideDD",
    ]);
  });

  it("acusa entrada que não é objeto", () => {
    expect(validateCatalog([42])).toEqual(["#0: não é um objeto"]);
  });
});
