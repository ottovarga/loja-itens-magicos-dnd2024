import type { Shop, ShopItem } from "../types";

export function makeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Empório do Anão",
    location: "Águas Profundas",
    kind: "Antiquário",
    description: "",
    notes: "",
    npcs: [],
    items: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeShopItem(itemId: string, overrides: Partial<ShopItem> = {}): ShopItem {
  return { itemId, qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0, ...overrides };
}
