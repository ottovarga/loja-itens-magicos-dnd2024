import type { CatalogItem, ItemType, Rarity } from "./types";

export interface EligibilityFilter {
  rarity: Rarity;
  types: readonly ItemType[];
}

export function eligibleItems(
  catalog: readonly CatalogItem[],
  filter: EligibilityFilter,
): CatalogItem[] {
  return catalog.filter(
    (item) => item.rarity === filter.rarity && filter.types.includes(item.type),
  );
}

export function indexCatalog(
  catalog: readonly CatalogItem[],
): Map<string, CatalogItem> {
  return new Map(catalog.map((item) => [item.id, item]));
}

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export interface SearchFilters {
  rarities?: readonly Rarity[];
  types?: readonly ItemType[];
}

export function searchCatalog(
  catalog: readonly CatalogItem[],
  query: string,
  filters: SearchFilters = {},
): CatalogItem[] {
  const q = normalizeText(query.trim());
  return catalog
    .filter(
      (item) =>
        (q === "" ||
          normalizeText(item.namePt).includes(q) ||
          normalizeText(item.nameEn).includes(q)) &&
        (!filters.rarities?.length || filters.rarities.includes(item.rarity)) &&
        (!filters.types?.length || filters.types.includes(item.type)),
    )
    .sort((a, b) => a.namePt.localeCompare(b.namePt, "pt-BR"));
}
