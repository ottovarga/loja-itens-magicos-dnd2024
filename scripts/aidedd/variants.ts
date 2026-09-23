import type { Rarity } from "../../src/lib/types";
import type { ManualVariant } from "./parse";

function variants(
  baseName: string,
  entries: readonly [key: string, label: string, rarity: Rarity][],
): ManualVariant[] {
  return entries.map(([key, label, rarity]) => ({ key, nameEn: `${baseName} (${label})`, rarity }));
}

const giants = (base: string, rarities: [Rarity, Rarity, Rarity, Rarity, Rarity, Rarity]) =>
  variants(base, [
    ["hill", "Hill", rarities[0]],
    ["frost", "Frost", rarities[1]],
    ["stone", "Stone", rarities[2]],
    ["fire", "Fire", rarities[3]],
    ["cloud", "Cloud", rarities[4]],
    ["storm", "Storm", rarities[5]],
  ]);

/** Confirmar no DMG 2024 impresso: o AideDD não publica esta tabela. */
const enspelled = (base: string) =>
  variants(base, [
    ["level-0-1", "Cantrip or Level 1", "uncommon"],
    ["level-2-3", "Level 2–3", "rare"],
    ["level-4-5", "Level 4–5", "very_rare"],
    ["level-6-8", "Level 6–8", "legendary"],
  ]);

export const MANUAL_VARIANTS: Record<string, ManualVariant[]> = {
  "belt-of-giant-strength": giants("Belt of Giant Strength", [
    "rare",
    "very_rare",
    "very_rare",
    "very_rare",
    "legendary",
    "legendary",
  ]),
  "potion-of-giant-strength": giants("Potion of Giant Strength", [
    "uncommon",
    "rare",
    "rare",
    "rare",
    "very_rare",
    "legendary",
  ]),
  "enspelled-armor": enspelled("Enspelled Armor"),
  "enspelled-staff": enspelled("Enspelled Staff"),
  "enspelled-weapon": enspelled("Enspelled Weapon"),
  "figurine-of-wondrous-power": variants("Figurine of Wondrous Power", [
    ["bronze-griffon", "Bronze Griffon", "rare"],
    ["ebony-fly", "Ebony Fly", "rare"],
    ["golden-lions", "Golden Lions", "rare"],
    ["ivory-goats", "Ivory Goats", "rare"],
    ["marble-elephant", "Marble Elephant", "rare"],
    ["obsidian-steed", "Obsidian Steed", "very_rare"],
    ["onyx-dog", "Onyx Dog", "rare"],
    ["serpentine-owl", "Serpentine Owl", "rare"],
    ["silver-raven", "Silver Raven", "uncommon"],
  ]),
  "horn-of-valhalla": variants("Horn of Valhalla", [
    ["silver", "Silver", "rare"],
    ["brass", "Brass", "rare"],
    ["bronze", "Bronze", "very_rare"],
    ["iron", "Iron", "legendary"],
  ]),
  "instrument-of-the-bards": variants("Instrument of the Bards", [
    ["anstruth-harp", "Anstruth Harp", "very_rare"],
    ["canaith-mandolin", "Canaith Mandolin", "rare"],
    ["cli-lyre", "Cli Lyre", "rare"],
    ["doss-lute", "Doss Lute", "uncommon"],
    ["fochlucan-bandore", "Fochlucan Bandore", "uncommon"],
    ["mac-fuirmidh-cittern", "Mac-Fuirmidh Cittern", "uncommon"],
    ["ollamh-harp", "Ollamh Harp", "legendary"],
  ]),
  "ioun-stone": variants("Ioun Stone", [
    ["absorption", "Absorption", "very_rare"],
    ["agility", "Agility", "very_rare"],
    ["awareness", "Awareness", "rare"],
    ["fortitude", "Fortitude", "very_rare"],
    ["greater-absorption", "Greater Absorption", "legendary"],
    ["insight", "Insight", "very_rare"],
    ["intellect", "Intellect", "very_rare"],
    ["leadership", "Leadership", "very_rare"],
    ["mastery", "Mastery", "legendary"],
    ["protection", "Protection", "rare"],
    ["regeneration", "Regeneration", "legendary"],
    ["reserve", "Reserve", "rare"],
    ["strength", "Strength", "very_rare"],
    ["sustenance", "Sustenance", "rare"],
  ]),
  "potions-of-healing": [
    { key: "healing", nameEn: "Potion of Healing", rarity: "common" },
    { key: "greater", nameEn: "Potion of Healing (Greater)", rarity: "uncommon" },
    { key: "superior", nameEn: "Potion of Healing (Superior)", rarity: "rare" },
    { key: "supreme", nameEn: "Potion of Healing (Supreme)", rarity: "very_rare" },
  ],
  "quaal-s-feather-token": variants("Quaal's Feather Token", [
    ["anchor", "Anchor", "uncommon"],
    ["bird", "Bird", "rare"],
    ["fan", "Fan", "uncommon"],
    ["swan-boat", "Swan Boat", "rare"],
    ["tree", "Tree", "uncommon"],
    ["whip", "Whip", "rare"],
  ]),
  "spell-scroll": variants("Spell Scroll", [
    ["cantrip", "Cantrip", "common"],
    ["level-1", "Level 1", "common"],
    ["level-2", "Level 2", "uncommon"],
    ["level-3", "Level 3", "uncommon"],
    ["level-4", "Level 4", "rare"],
    ["level-5", "Level 5", "rare"],
    ["level-6", "Level 6", "very_rare"],
    ["level-7", "Level 7", "very_rare"],
    ["level-8", "Level 8", "very_rare"],
    ["level-9", "Level 9", "legendary"],
  ]),
};
