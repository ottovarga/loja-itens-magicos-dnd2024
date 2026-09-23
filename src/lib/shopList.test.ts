import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import { buildItemGroups } from "./shopList";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { makeShopItem } from "./__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const items = [
  makeShopItem("ring-of-protection", { priceMods: { random: 0, individual: 10 } }),
  makeShopItem("potion-of-healing"),
  makeShopItem("armor-plus-1"),
  makeShopItem("common-wondrous-1"),
  makeShopItem("item-que-sumiu"),
];

describe("buildItemGroups", () => {
  it("agrupa na ordem das raridades e omite grupos vazios", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups.map((g) => g.rarity)).toEqual(["common", "rare"]);
  });

  it("ignora itens que não estão no catálogo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups.flatMap((g) => g.rows)).toHaveLength(4);
  });

  it("calcula preço final e preço base de cada linha", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    const ring = groups[1].rows.find((r) => r.item.id === "ring-of-protection");
    expect(ring).toMatchObject({ price: 4400, base: 4000 });
  });

  it("filtra por tipo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name", type: "wondrous" });
    expect(groups.map((g) => g.rows.map((r) => r.item.id))).toEqual([["common-wondrous-1"]]);
  });

  it("filtra por raridade", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name", rarity: "rare" });
    expect(groups.map((g) => g.rarity)).toEqual(["rare"]);
  });

  it("ordena por nome em português dentro do grupo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups[0].rows.map((r) => r.item.namePt)).toEqual(["common-wondrous-1", "Poção de Cura"]);
  });

  it("ordena por preço do maior para o menor", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "price_desc" });
    expect(groups[1].rows.map((r) => r.item.id)).toEqual(["ring-of-protection", "armor-plus-1"]);
  });

  it("ordena por preço do menor para o maior", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "price_asc" });
    expect(groups[0].rows.map((r) => r.item.id)).toEqual(["potion-of-healing", "common-wondrous-1"]);
  });
});
