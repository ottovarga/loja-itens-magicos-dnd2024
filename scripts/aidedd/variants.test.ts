import { describe, expect, it } from "vitest";
import { RARITIES } from "../../src/lib/types";
import { MANUAL_VARIANTS } from "./variants";

const SLUGS = [
  "belt-of-giant-strength",
  "enspelled-armor",
  "enspelled-staff",
  "enspelled-weapon",
  "figurine-of-wondrous-power",
  "horn-of-valhalla",
  "instrument-of-the-bards",
  "ioun-stone",
  "potion-of-giant-strength",
  "potions-of-healing",
  "quaal-s-feather-token",
  "spell-scroll",
];

describe("MANUAL_VARIANTS", () => {
  it("cobre os doze itens de raridade variável sem padrão +N", () => {
    expect(Object.keys(MANUAL_VARIANTS).sort()).toEqual(SLUGS);
  });

  it("não repete chave dentro do mesmo item", () => {
    for (const variants of Object.values(MANUAL_VARIANTS)) {
      const keys = variants.map((v) => v.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("usa só raridades válidas e nomes preenchidos", () => {
    for (const variants of Object.values(MANUAL_VARIANTS)) {
      for (const v of variants) {
        expect(RARITIES).toContain(v.rarity);
        expect(v.nameEn.trim()).not.toBe("");
      }
    }
  });
});
