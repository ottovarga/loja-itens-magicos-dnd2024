import { basePrice, finalPrice } from "./pricing";
import { RARITIES, type CatalogItem, type ItemType, type Rarity, type ShopItem } from "./types";

export type SortKey = "name" | "price_asc" | "price_desc";

export interface ListFilters {
  sort: SortKey;
  type?: ItemType;
  rarity?: Rarity;
}

export interface ItemRowData {
  shopItem: ShopItem;
  item: CatalogItem;
  price: number | null;
  base: number | null;
}

export interface RarityGroup {
  rarity: Rarity;
  rows: ItemRowData[];
}

export function buildItemGroups(
  items: readonly ShopItem[],
  index: ReadonlyMap<string, CatalogItem>,
  generalMod: number,
  filters: ListFilters,
): RarityGroup[] {
  const rows = items
    .flatMap((shopItem) => {
      const item = index.get(shopItem.itemId);
      return item
        ? [{ shopItem, item, price: finalPrice(item, shopItem, generalMod), base: basePrice(item) }]
        : [];
    })
    .filter(
      (row) =>
        (!filters.type || row.item.type === filters.type) &&
        (!filters.rarity || row.item.rarity === filters.rarity),
    );
  return RARITIES.map((rarity) => ({
    rarity,
    rows: sortRows(
      rows.filter((row) => row.item.rarity === rarity),
      filters.sort,
    ),
  })).filter((group) => group.rows.length > 0);
}

function byName(a: ItemRowData, b: ItemRowData): number {
  return a.item.namePt.localeCompare(b.item.namePt, "pt-BR");
}

/** Linhas sem preço vão para o fim nas duas direções. */
function byPrice(direction: 1 | -1) {
  return (a: ItemRowData, b: ItemRowData): number => {
    if (a.price === b.price) return byName(a, b);
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return (a.price - b.price) * direction;
  };
}

function sortRows(rows: ItemRowData[], sort: SortKey): ItemRowData[] {
  const compare = sort === "name" ? byName : byPrice(sort === "price_asc" ? 1 : -1);
  return [...rows].sort(compare);
}
