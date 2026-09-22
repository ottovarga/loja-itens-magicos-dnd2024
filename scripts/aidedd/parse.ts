import { AIDEDD_BASE_URL } from "../../src/lib/catalogValidation";
import type { CatalogItem, ItemType, Rarity } from "../../src/lib/types";

export interface RawRow {
  slug: string;
  nameEn: string;
  typeRaw: string;
  rarityRaw: string;
  attunement: boolean;
}

export type ScrapedItem = Omit<CatalogItem, "namePt">;

export interface ManualVariant {
  key: string;
  nameEn: string;
  rarity: Rarity;
}

const ENTITIES: Record<string, string> = {
  "&#039;": "'",
  "&#39;": "'",
  "&amp;": "&",
  "&quot;": '"',
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&#0?39;|&amp;|&quot;|&nbsp;/g, (entity) => ENTITIES[entity] ?? entity);
}

export function parseListHtml(html: string): RawRow[] {
  const rows: RawRow[] = [];
  for (const chunk of html.split("<tr>").slice(1)) {
    const link = chunk.match(/href='\/magic-item\/([^']+)'[^>]*>([^<]+)<\/a>/);
    if (!link) continue;
    rows.push({
      slug: link[1],
      nameEn: decodeEntities(link[2]).trim(),
      typeRaw: chunk.match(/class='tag1'>([^<]*)/)?.[1].trim() ?? "",
      rarityRaw: chunk.match(/class='tag2'>([^<]*)/)?.[1].trim() ?? "",
      attunement: /class="colL">Attunement/.test(chunk),
    });
  }
  return rows;
}

const TYPE_MAP: Record<string, ItemType> = {
  Armor: "armor",
  Potion: "potion",
  Ring: "ring",
  Rod: "rod",
  Scroll: "scroll",
  Staff: "staff",
  Wand: "wand",
  Weapon: "weapon",
  "Wondrous Item": "wondrous",
};

export function mapType(typeRaw: string): ItemType {
  const type = TYPE_MAP[typeRaw];
  if (!type) throw new Error(`Tipo desconhecido no AideDD: "${typeRaw}"`);
  return type;
}

const RARITY_MAP: Record<string, Rarity> = {
  Common: "common",
  Uncommon: "uncommon",
  Rare: "rare",
  "Very Rare": "very_rare",
  Legendary: "legendary",
  Artifact: "artifact",
};

export function parsePlusVariants(
  rarityRaw: string,
): { bonus: number; rarity: Rarity }[] | null {
  const matches = [...rarityRaw.matchAll(/(Very Rare|Uncommon|Common|Rare|Legendary) \(\+(\d)\)/g)];
  if (matches.length === 0) return null;
  return matches.map((m) => ({ bonus: Number(m[2]), rarity: RARITY_MAP[m[1]] }));
}

export function expandRow(
  row: RawRow,
  manualVariants: Record<string, readonly ManualVariant[]>,
): ScrapedItem[] {
  const type = mapType(row.typeRaw);
  const make = (id: string, nameEn: string, rarity: Rarity): ScrapedItem => ({
    id,
    nameEn,
    type,
    rarity,
    attunement: row.attunement,
    source: "DMG 2024",
    url: `${AIDEDD_BASE_URL}${row.slug}`,
    consumable: type === "potion" || type === "scroll",
  });

  const manual = manualVariants[row.slug];
  if (manual) return manual.map((v) => make(`${row.slug}--${v.key}`, v.nameEn, v.rarity));

  const single = RARITY_MAP[row.rarityRaw];
  if (single) return [make(row.slug, row.nameEn, single)];

  const plus = parsePlusVariants(row.rarityRaw);
  if (plus) {
    const baseName = row.nameEn.replace(/,?\s*\+1, \+2, or \+3$/, "");
    return plus.map(({ bonus, rarity }) =>
      make(`${row.slug}--plus-${bonus}`, `${baseName} +${bonus}`, rarity),
    );
  }

  throw new Error(
    `Raridade não reconhecida para ${row.slug}: "${row.rarityRaw}". Acrescente em scripts/aidedd/variants.ts.`,
  );
}

export function attachPtNames(
  items: readonly ScrapedItem[],
  names: Readonly<Record<string, string>>,
): CatalogItem[] {
  return items.map((item) => ({
    id: item.id,
    nameEn: item.nameEn,
    namePt: names[item.id] ?? "",
    type: item.type,
    rarity: item.rarity,
    attunement: item.attunement,
    source: item.source,
    url: item.url,
    consumable: item.consumable,
  }));
}

export function mergeNameKeys(
  names: Readonly<Record<string, string>>,
  ids: readonly string[],
): Record<string, string> {
  const merged: Record<string, string> = { ...names };
  for (const id of ids) merged[id] ??= "";
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
}
