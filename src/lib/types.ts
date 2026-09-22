export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "legendary",
  "artifact",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const ITEM_TYPES = [
  "armor",
  "potion",
  "ring",
  "rod",
  "scroll",
  "staff",
  "wand",
  "weapon",
  "wondrous",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface CatalogItem {
  id: string;
  nameEn: string;
  namePt: string;
  type: ItemType;
  rarity: Rarity;
  attunement: boolean;
  source: string;
  url: string;
  consumable: boolean;
}

export interface ShopItem {
  itemId: string;
  qty: number;
  priceMods: { random: number; individual: number };
  priceOverride?: number;
  sold: number;
}

export interface GenConfig {
  rarityCounts: Record<Rarity, number>;
  types: ItemType[];
  typeWeights?: Partial<Record<ItemType, number>>;
  allowRepeat: boolean;
  qtyRange: { potion: [number, number]; scroll: [number, number] };
  randomVariance: number;
  generalMod: number;
  includeArtifacts: boolean;
}

export interface Npc {
  id: string;
  name: string;
  role: string;
  description: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  kind: string;
  description: string;
  notes: string;
  npcs: Npc[];
  items: ShopItem[];
  lastConfig?: GenConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Shortfall {
  rarity: Rarity;
  requested: number;
  generated: number;
}

export interface GenerationResult {
  items: ShopItem[];
  shortfalls: Shortfall[];
}

export interface Clock {
  now: () => Date;
}

export interface IdSource {
  newId: () => string;
}
