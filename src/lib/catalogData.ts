import items from "@/data/items.json";
import { indexCatalog } from "./catalog";
import type { CatalogItem } from "./types";

export const CATALOG: readonly CatalogItem[] = items as CatalogItem[];
export const CATALOG_INDEX = indexCatalog(CATALOG);
