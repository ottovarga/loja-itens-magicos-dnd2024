import { ITEM_TYPES, RARITIES, type GenConfig, type ItemType, type Rarity } from "./types";

export function defaultGenConfig(): GenConfig {
  return {
    rarityCounts: { common: 4, uncommon: 3, rare: 2, very_rare: 1, legendary: 0, artifact: 0 },
    types: [...ITEM_TYPES],
    allowRepeat: false,
    qtyRange: { potion: [1, 3], scroll: [1, 5] },
    randomVariance: 10,
    generalMod: 0,
    includeArtifacts: false,
  };
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function toInt(n: number, min: number): number {
  return Math.max(min, Math.round(finite(n)));
}

function toRange([a, b]: [number, number]): [number, number] {
  const lo = toInt(a, 1);
  const hi = toInt(b, 1);
  return lo <= hi ? [lo, hi] : [hi, lo];
}

export function sanitizeConfig(config: GenConfig): GenConfig {
  const rarityCounts = Object.fromEntries(
    RARITIES.map((r) => [r, toInt(config.rarityCounts[r], 0)]),
  ) as Record<Rarity, number>;
  const typeWeights = config.typeWeights
    ? (Object.fromEntries(
        config.types.map((t) => [t, toInt(config.typeWeights?.[t] ?? 0, 0)]),
      ) as Partial<Record<ItemType, number>>)
    : undefined;
  return {
    ...config,
    rarityCounts,
    typeWeights,
    qtyRange: { potion: toRange(config.qtyRange.potion), scroll: toRange(config.qtyRange.scroll) },
    randomVariance: toInt(config.randomVariance, 0),
    generalMod: Math.round(finite(config.generalMod)),
  };
}
