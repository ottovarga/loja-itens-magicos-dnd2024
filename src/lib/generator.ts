import { eligibleItems } from "./catalog";
import { RARITY_LABEL } from "./labels";
import { pickOne, pickWeighted, randomInt, type Rng } from "./random";
import {
  RARITIES,
  type CatalogItem,
  type GenConfig,
  type GenerationResult,
  type ShopItem,
  type Shortfall,
} from "./types";

export interface GenerateInput {
  catalog: readonly CatalogItem[];
  config: GenConfig;
  existing?: readonly ShopItem[];
  rng: Rng;
}

export function generateItems({
  catalog,
  config,
  existing = [],
  rng,
}: GenerateInput): GenerationResult {
  const items = existing.map(cloneShopItem);
  const shortfalls: Shortfall[] = [];
  for (const rarity of RARITIES) {
    const requested = config.rarityCounts[rarity];
    if (requested <= 0) continue;
    if (rarity === "artifact" && !config.includeArtifacts) continue;
    const pool = eligibleItems(catalog, { rarity, types: config.types }).filter((item) =>
      hasWeight(config, item),
    );
    let generated = 0;
    for (let n = 0; n < requested; n++) {
      const available = config.allowRepeat
        ? pool
        : pool.filter((item) => !items.some((s) => s.itemId === item.id));
      if (available.length === 0) break;
      addToShop(items, pickItem(rng, available, config), config, rng);
      generated++;
    }
    if (generated < requested) shortfalls.push({ rarity, requested, generated });
  }
  return { items, shortfalls };
}

export function describeShortfalls(shortfalls: readonly Shortfall[]): string[] {
  return shortfalls.map(
    (s) => `Só ${s.generated} de ${s.requested} ${RARITY_LABEL[s.rarity]} disponíveis com esses filtros.`,
  );
}

function cloneShopItem(item: ShopItem): ShopItem {
  return { ...item, priceMods: { ...item.priceMods } };
}

function hasWeight(config: GenConfig, item: CatalogItem): boolean {
  return !config.typeWeights || (config.typeWeights[item.type] ?? 0) > 0;
}

function pickItem(rng: Rng, available: readonly CatalogItem[], config: GenConfig): CatalogItem {
  const weights = config.typeWeights;
  if (!weights) return pickOne(rng, available);
  const types = [...new Set(available.map((item) => item.type))];
  const type = pickWeighted(rng, types.map((t) => [t, weights[t] ?? 0] as const));
  return pickOne(rng, available.filter((item) => item.type === type));
}

function rollRandomMod(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (config.randomVariance <= 0 || item.rarity === "artifact") return 0;
  return randomInt(rng, -config.randomVariance, config.randomVariance);
}

function rollQty(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (item.type === "potion") return randomInt(rng, ...config.qtyRange.potion);
  if (item.type === "scroll") return randomInt(rng, ...config.qtyRange.scroll);
  return 1;
}

function addToShop(items: ShopItem[], item: CatalogItem, config: GenConfig, rng: Rng): void {
  const qty = rollQty(rng, item, config);
  const current = items.find((s) => s.itemId === item.id);
  if (current) {
    current.qty += qty;
    return;
  }
  items.push({
    itemId: item.id,
    qty,
    priceMods: { random: rollRandomMod(rng, item, config), individual: 0 },
    sold: 0,
  });
}
