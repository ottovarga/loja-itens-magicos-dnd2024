import { ITEM_TYPES, type GenConfig, type Rarity } from "../types";

export function counts(
  partial: Partial<Record<Rarity, number>>,
): Record<Rarity, number> {
  return {
    common: 0,
    uncommon: 0,
    rare: 0,
    very_rare: 0,
    legendary: 0,
    artifact: 0,
    ...partial,
  };
}

export function makeConfig(overrides: Partial<GenConfig> = {}): GenConfig {
  return {
    rarityCounts: counts({}),
    types: [...ITEM_TYPES],
    allowRepeat: false,
    qtyRange: { potion: [1, 1], scroll: [1, 1] },
    randomVariance: 0,
    generalMod: 0,
    includeArtifacts: false,
    ...overrides,
  };
}
