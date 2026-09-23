import type { ItemType, Rarity } from "./types";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  very_rare: "Muito Raro",
  legendary: "Lendário",
  artifact: "Artefato",
};

export const RARITY_SHORT: Record<Rarity, string> = {
  common: "C",
  uncommon: "U",
  rare: "R",
  very_rare: "VR",
  legendary: "L",
  artifact: "A",
};

export const TYPE_LABEL: Record<ItemType, string> = {
  armor: "Armadura",
  potion: "Poção",
  ring: "Anel",
  rod: "Bastão",
  scroll: "Pergaminho",
  staff: "Cajado",
  wand: "Varinha",
  weapon: "Arma",
  wondrous: "Item Maravilhoso",
};
