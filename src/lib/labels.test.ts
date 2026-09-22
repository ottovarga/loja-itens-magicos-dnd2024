import { describe, expect, it } from "vitest";
import { RARITY_LABEL, RARITY_SHORT, TYPE_LABEL } from "./labels";
import { ITEM_TYPES, RARITIES } from "./types";

describe("rótulos", () => {
  it("tem rótulo em português para toda raridade", () => {
    for (const r of RARITIES) expect(RARITY_LABEL[r]).toBeTruthy();
    expect(RARITY_LABEL.very_rare).toBe("Muito Raro");
  });

  it("tem sigla para toda raridade", () => {
    expect(RARITIES.map((r) => RARITY_SHORT[r])).toEqual(["C", "U", "R", "VR", "L", "A"]);
  });

  it("tem rótulo em português para todo tipo", () => {
    for (const t of ITEM_TYPES) expect(TYPE_LABEL[t]).toBeTruthy();
    expect(TYPE_LABEL.wondrous).toBe("Item Maravilhoso");
  });
});
