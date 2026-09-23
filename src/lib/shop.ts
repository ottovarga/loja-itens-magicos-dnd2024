import { normalizeText } from "./catalog";
import { RARITY_SHORT } from "./labels";
import {
  RARITIES,
  type CatalogItem,
  type Clock,
  type IdSource,
  type Npc,
  type Rarity,
  type Shop,
  type ShopItem,
} from "./types";

export interface NewShopInput {
  name: string;
  location: string;
  kind: string;
}

export function createShop(input: NewShopInput, deps: Clock & IdSource): Shop {
  const now = deps.now().toISOString();
  return {
    id: deps.newId(),
    name: input.name.trim(),
    location: input.location.trim(),
    kind: input.kind.trim(),
    description: "",
    notes: "",
    npcs: [],
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateShop(shop: Shop, deps: Clock & IdSource): Shop {
  const now = deps.now().toISOString();
  const copy = JSON.parse(JSON.stringify(shop)) as Shop;
  return { ...copy, id: deps.newId(), name: `${shop.name} (cópia)`, createdAt: now, updatedAt: now };
}

export function upsertShopInList(shops: readonly Shop[], shop: Shop): Shop[] {
  const index = shops.findIndex((s) => s.id === shop.id);
  if (index < 0) return [...shops, shop];
  const next = [...shops];
  next[index] = shop;
  return next;
}

export function removeShopFromList(shops: readonly Shop[], id: string): Shop[] {
  return shops.filter((s) => s.id !== id);
}

export function filterShops(shops: readonly Shop[], query: string): Shop[] {
  const q = normalizeText(query.trim());
  if (q === "") return [...shops];
  return shops.filter(
    (s) => normalizeText(s.name).includes(q) || normalizeText(s.location).includes(q),
  );
}

export function countByRarity(
  items: readonly ShopItem[],
  index: ReadonlyMap<string, CatalogItem>,
): Record<Rarity, number> {
  const result = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
  for (const shopItem of items) {
    const item = index.get(shopItem.itemId);
    if (item) result[item.rarity]++;
  }
  return result;
}

export function formatRarityChips(countsByRarity: Record<Rarity, number>): string {
  return RARITIES.filter((r) => countsByRarity[r] > 0)
    .map((r) => `${countsByRarity[r]} ${RARITY_SHORT[r]}`)
    .join(" · ");
}

export function generalModOf(shop: Shop): number {
  return shop.lastConfig?.generalMod ?? 0;
}

function mapItem(
  items: readonly ShopItem[],
  itemId: string,
  fn: (item: ShopItem) => ShopItem,
): ShopItem[] {
  return items.map((item) => (item.itemId === itemId ? fn(item) : item));
}

export function addManualItem(items: readonly ShopItem[], itemId: string): ShopItem[] {
  if (items.some((item) => item.itemId === itemId)) {
    return mapItem(items, itemId, (item) => ({ ...item, qty: item.qty + 1 }));
  }
  return [...items, { itemId, qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 }];
}

export function setQty(items: readonly ShopItem[], itemId: string, qty: number): ShopItem[] {
  const next = Math.max(1, Math.round(qty));
  return mapItem(items, itemId, (item) => ({ ...item, qty: next, sold: Math.min(item.sold, next) }));
}

export function setIndividualMod(
  items: readonly ShopItem[],
  itemId: string,
  percent: number,
): ShopItem[] {
  return mapItem(items, itemId, (item) => ({
    ...item,
    priceMods: { ...item.priceMods, individual: Math.round(percent) },
  }));
}

export function setPriceOverride(
  items: readonly ShopItem[],
  itemId: string,
  value: number | undefined,
): ShopItem[] {
  return mapItem(items, itemId, (item) => {
    const next = { ...item };
    if (value === undefined) delete next.priceOverride;
    else next.priceOverride = Math.max(0, Math.round(value));
    return next;
  });
}

export function changeSold(items: readonly ShopItem[], itemId: string, delta: number): ShopItem[] {
  return mapItem(items, itemId, (item) => ({
    ...item,
    sold: Math.min(item.qty, Math.max(0, item.sold + delta)),
  }));
}

export function removeShopItem(items: readonly ShopItem[], itemId: string): ShopItem[] {
  return items.filter((item) => item.itemId !== itemId);
}

export function addNpc(npcs: readonly Npc[], deps: IdSource): Npc[] {
  return [...npcs, { id: deps.newId(), name: "", role: "", description: "" }];
}

export function updateNpc(
  npcs: readonly Npc[],
  id: string,
  patch: Partial<Omit<Npc, "id">>,
): Npc[] {
  return npcs.map((npc) => (npc.id === id ? { ...npc, ...patch } : npc));
}

export function removeNpc(npcs: readonly Npc[], id: string): Npc[] {
  return npcs.filter((npc) => npc.id !== id);
}
