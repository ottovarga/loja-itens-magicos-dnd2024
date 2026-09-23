import { describe, expect, it } from "vitest";
import { eligibleItems, indexCatalog, searchCatalog } from "./catalog";
import { fixtureCatalog } from "./__fixtures__/catalog";

const ids = (items: { id: string }[]) => items.map((i) => i.id).sort();

describe("eligibleItems", () => {
  it("filtra pela raridade", () => {
    expect(
      ids(eligibleItems(fixtureCatalog, { rarity: "rare", types: ["armor", "ring"] })),
    ).toEqual(["armor-plus-1", "ring-of-protection"]);
  });

  it("filtra pelos tipos marcados", () => {
    expect(
      ids(eligibleItems(fixtureCatalog, { rarity: "uncommon", types: ["weapon"] })),
    ).toEqual(["weapon-plus-1"]);
  });

  it("devolve lista vazia quando nenhum tipo está marcado", () => {
    expect(eligibleItems(fixtureCatalog, { rarity: "common", types: [] })).toEqual([]);
  });
});

describe("indexCatalog", () => {
  it("indexa itens pelo id", () => {
    const index = indexCatalog(fixtureCatalog);
    expect(index.get("bag-of-holding")?.namePt).toBe("Bolsa Guarda-Tudo");
  });
});

describe("searchCatalog", () => {
  it("busca pelo nome em português ignorando acentos e caixa", () => {
    expect(ids(searchCatalog(fixtureCatalog, "POCAO"))).toEqual(["potion-of-healing"]);
  });

  it("busca pelo nome em inglês", () => {
    expect(ids(searchCatalog(fixtureCatalog, "bag of"))).toEqual(["bag-of-holding"]);
  });

  it("filtra por raridade", () => {
    expect(
      ids(searchCatalog(fixtureCatalog, "", { rarities: ["rare"] })),
    ).toEqual(["armor-plus-1", "ring-of-protection"]);
  });

  it("filtra por tipo", () => {
    expect(
      ids(searchCatalog(fixtureCatalog, "", { types: ["ring"] })),
    ).toEqual(["ring-of-protection"]);
  });

  it("ordena pelo nome em português", () => {
    const names = searchCatalog(fixtureCatalog, "").map((i) => i.namePt);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });
});
