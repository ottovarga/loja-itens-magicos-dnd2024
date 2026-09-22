import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import {
  addManualItem,
  addNpc,
  changeSold,
  countByRarity,
  createShop,
  duplicateShop,
  filterShops,
  formatRarityChips,
  generalModOf,
  removeNpc,
  removeShopFromList,
  removeShopItem,
  setIndividualMod,
  setPriceOverride,
  setQty,
  updateNpc,
  upsertShopInList,
} from "./shop";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { counts, makeConfig } from "./__fixtures__/config";
import { makeDeps } from "./__fixtures__/deps";
import { makeShop, makeShopItem } from "./__fixtures__/shop";

describe("createShop", () => {
  it("cria loja vazia com id e datas injetados", () => {
    const shop = createShop(
      { name: "  A Lâmpada  ", location: "Neverwinter", kind: "Bazar" },
      makeDeps("2026-09-22T12:00:00.000Z"),
    );
    expect(shop).toEqual({
      id: "id-1",
      name: "A Lâmpada",
      location: "Neverwinter",
      kind: "Bazar",
      description: "",
      notes: "",
      npcs: [],
      items: [],
      createdAt: "2026-09-22T12:00:00.000Z",
      updatedAt: "2026-09-22T12:00:00.000Z",
    });
  });
});

describe("duplicateShop", () => {
  it("cria cópia com novo id, nome marcado e datas novas", () => {
    const original = makeShop({ items: [makeShopItem("bag-of-holding")] });
    const copy = duplicateShop(original, makeDeps("2026-09-22T12:00:00.000Z"));
    expect(copy.id).toBe("id-1");
    expect(copy.name).toBe("Empório do Anão (cópia)");
    expect(copy.createdAt).toBe("2026-09-22T12:00:00.000Z");
    expect(copy.items).toEqual(original.items);
  });

  it("não compartilha listas com a loja original", () => {
    const original = makeShop({ items: [makeShopItem("bag-of-holding")] });
    const copy = duplicateShop(original, makeDeps());
    copy.items[0].qty = 99;
    expect(original.items[0].qty).toBe(1);
  });
});

describe("lista de lojas", () => {
  it("upsertShopInList substitui a loja com o mesmo id", () => {
    const list = [makeShop({ id: "a" }), makeShop({ id: "b" })];
    const result = upsertShopInList(list, makeShop({ id: "a", name: "Nova" }));
    expect(result.map((s) => s.name)).toEqual(["Nova", "Empório do Anão"]);
  });

  it("upsertShopInList acrescenta loja nova no fim", () => {
    const result = upsertShopInList([makeShop({ id: "a" })], makeShop({ id: "b" }));
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("removeShopFromList tira a loja pelo id", () => {
    const result = removeShopFromList([makeShop({ id: "a" }), makeShop({ id: "b" })], "a");
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("filterShops busca por nome ou local, sem acento", () => {
    const list = [
      makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar" }),
      makeShop({ id: "b", name: "Bazar", location: "Águas Profundas" }),
    ];
    expect(filterShops(list, "runica").map((s) => s.id)).toEqual(["a"]);
    expect(filterShops(list, "aguas").map((s) => s.id)).toEqual(["b"]);
    expect(filterShops(list, "  ")).toHaveLength(2);
  });
});

describe("countByRarity e formatRarityChips", () => {
  const index = indexCatalog(fixtureCatalog);

  it("conta linhas por raridade e ignora itens fora do catálogo", () => {
    const items = [
      makeShopItem("potion-of-healing", { qty: 5 }),
      makeShopItem("common-wondrous-1"),
      makeShopItem("armor-plus-1"),
      makeShopItem("item-que-sumiu"),
    ];
    expect(countByRarity(items, index)).toEqual(counts({ common: 2, rare: 1 }));
  });

  it("monta os chips na ordem das raridades e pula zeros", () => {
    expect(formatRarityChips(counts({ common: 6, uncommon: 4, rare: 2 }))).toBe("6 C · 4 U · 2 R");
    expect(formatRarityChips(counts({ very_rare: 1, artifact: 1 }))).toBe("1 VR · 1 A");
  });

  it("devolve texto vazio para loja sem itens", () => {
    expect(formatRarityChips(counts({}))).toBe("");
  });
});

describe("generalModOf", () => {
  it("usa o percentual geral da última configuração", () => {
    expect(generalModOf(makeShop({ lastConfig: makeConfig({ generalMod: 15 }) }))).toBe(15);
  });

  it("é zero quando a loja nunca foi gerada", () => {
    expect(generalModOf(makeShop())).toBe(0);
  });
});

describe("edição de itens da loja", () => {
  it("addManualItem acrescenta item novo com quantidade 1", () => {
    expect(addManualItem([], "bag-of-holding")).toEqual([makeShopItem("bag-of-holding")]);
  });

  it("addManualItem soma 1 quando o item já está na loja", () => {
    const result = addManualItem([makeShopItem("bag-of-holding", { qty: 2 })], "bag-of-holding");
    expect(result).toEqual([makeShopItem("bag-of-holding", { qty: 3 })]);
  });

  it("setQty não aceita menos que 1 e ajusta vendidos", () => {
    const items = [makeShopItem("a", { qty: 5, sold: 4 })];
    expect(setQty(items, "a", 2)[0]).toMatchObject({ qty: 2, sold: 2 });
    expect(setQty(items, "a", 0)[0].qty).toBe(1);
  });

  it("setIndividualMod grava o percentual individual", () => {
    const result = setIndividualMod([makeShopItem("a")], "a", -15);
    expect(result[0].priceMods).toEqual({ random: 0, individual: -15 });
  });

  it("setPriceOverride grava e remove o preço manual", () => {
    const withPrice = setPriceOverride([makeShopItem("a")], "a", 750);
    expect(withPrice[0].priceOverride).toBe(750);
    const cleared = setPriceOverride(withPrice, "a", undefined);
    expect("priceOverride" in cleared[0]).toBe(false);
  });

  it("changeSold fica entre 0 e a quantidade", () => {
    const items = [makeShopItem("a", { qty: 2, sold: 1 })];
    expect(changeSold(items, "a", 1)[0].sold).toBe(2);
    expect(changeSold(items, "a", 5)[0].sold).toBe(2);
    expect(changeSold(items, "a", -5)[0].sold).toBe(0);
  });

  it("removeShopItem tira o item", () => {
    expect(removeShopItem([makeShopItem("a"), makeShopItem("b")], "a")).toEqual([makeShopItem("b")]);
  });

  it("não altera a lista recebida", () => {
    const items = [makeShopItem("a")];
    setQty(items, "a", 3);
    expect(items[0].qty).toBe(1);
  });
});

describe("NPCs", () => {
  it("addNpc acrescenta NPC em branco com id novo", () => {
    expect(addNpc([], makeDeps())).toEqual([{ id: "id-1", name: "", role: "", description: "" }]);
  });

  it("updateNpc altera só o NPC indicado", () => {
    const npcs = [
      { id: "a", name: "Brom", role: "Dono", description: "" },
      { id: "b", name: "Lia", role: "Aprendiz", description: "" },
    ];
    const result = updateNpc(npcs, "b", { role: "Sócia" });
    expect(result[1].role).toBe("Sócia");
    expect(result[0]).toBe(npcs[0]);
  });

  it("removeNpc tira o NPC pelo id", () => {
    const npcs = [{ id: "a", name: "Brom", role: "", description: "" }];
    expect(removeNpc(npcs, "a")).toEqual([]);
  });
});
