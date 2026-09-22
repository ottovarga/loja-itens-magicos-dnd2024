import type { CatalogItem, ItemType, Rarity } from "../types";

function item(
  id: string,
  type: ItemType,
  rarity: Rarity,
  extra: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    id,
    nameEn: id,
    namePt: id,
    type,
    rarity,
    attunement: false,
    source: "DMG 2024",
    url: `https://www.aidedd.org/magic-item/${id}`,
    consumable: type === "potion" || type === "scroll",
    ...extra,
  };
}

/**
 * Por raridade:
 * - common: 1 poção, 1 pergaminho, 2 maravilhosos
 * - uncommon: 2 maravilhosos, 1 arma, 1 poção
 * - rare: 1 armadura, 1 anel
 * - very_rare: 1 maravilhoso
 * - legendary: 1 arma
 * - artifact: 1 arma, 1 maravilhoso
 */
export const fixtureCatalog: CatalogItem[] = [
  item("potion-of-healing", "potion", "common", {
    nameEn: "Potion of Healing",
    namePt: "Poção de Cura",
  }),
  item("spell-scroll-cantrip", "scroll", "common", {
    nameEn: "Spell Scroll (Cantrip)",
    namePt: "Pergaminho de Magia (Truque)",
  }),
  item("common-wondrous-1", "wondrous", "common"),
  item("common-wondrous-2", "wondrous", "common"),
  item("bag-of-holding", "wondrous", "uncommon", {
    nameEn: "Bag of Holding",
    namePt: "Bolsa Guarda-Tudo",
  }),
  item("uncommon-wondrous-2", "wondrous", "uncommon"),
  item("weapon-plus-1", "weapon", "uncommon", {
    nameEn: "Weapon +1",
    namePt: "Arma +1",
  }),
  item("potion-of-healing-greater", "potion", "uncommon"),
  item("armor-plus-1", "armor", "rare"),
  item("ring-of-protection", "ring", "rare", { attunement: true }),
  item("very-rare-wondrous", "wondrous", "very_rare"),
  item("legendary-weapon", "weapon", "legendary"),
  item("axe-of-the-dwarvish-lords", "weapon", "artifact"),
  item("orb-of-dragonkind", "wondrous", "artifact"),
];
