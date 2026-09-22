import type { CatalogItem, Rarity, ShopItem } from "./types";

export const BASE_PRICE: Record<Exclude<Rarity, "artifact">, number> = {
  common: 100,
  uncommon: 400,
  rare: 4000,
  very_rare: 40000,
  legendary: 200000,
};

export function basePrice(
  item: Pick<CatalogItem, "rarity" | "consumable">,
): number | null {
  if (item.rarity === "artifact") return null;
  const base = BASE_PRICE[item.rarity];
  return item.consumable ? base / 2 : base;
}

export function finalPrice(
  item: Pick<CatalogItem, "rarity" | "consumable">,
  shopItem: Pick<ShopItem, "priceMods" | "priceOverride">,
  generalMod: number,
): number | null {
  if (shopItem.priceOverride !== undefined) return shopItem.priceOverride;
  const base = basePrice(item);
  if (base === null) return null;
  const { random, individual } = shopItem.priceMods;
  const price =
    base * (1 + random / 100) * (1 + generalMod / 100) * (1 + individual / 100);
  return Math.max(0, Math.round(price));
}

const gpFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatGp(value: number | null): string {
  return value === null ? "—" : `${gpFormatter.format(value)} PO`;
}
