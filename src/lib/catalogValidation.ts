import { isRecord, isString } from "./guards";
import { ITEM_TYPES, RARITIES } from "./types";

export const AIDEDD_BASE_URL = "https://www.aidedd.org/magic-item/";

const isBlank = (value: unknown) => !isString(value) || value.trim() === "";

export function validateCatalog(entries: readonly unknown[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  entries.forEach((entry, i) => {
    if (!isRecord(entry)) {
      errors.push(`#${i}: não é um objeto`);
      return;
    }
    const label = isBlank(entry.id) ? `#${i}` : String(entry.id);
    if (isBlank(entry.id)) errors.push(`${label}: id vazio`);
    else if (seen.has(label)) errors.push(`${label}: id repetido`);
    else seen.add(label);

    const typeIsValid = (ITEM_TYPES as readonly unknown[]).includes(entry.type);
    if (!typeIsValid) errors.push(`${label}: tipo inválido "${String(entry.type)}"`);
    if (!(RARITIES as readonly unknown[]).includes(entry.rarity)) {
      errors.push(`${label}: raridade inválida "${String(entry.rarity)}"`);
    }
    if (isBlank(entry.nameEn)) errors.push(`${label}: nome em inglês vazio`);
    if (isBlank(entry.namePt)) errors.push(`${label}: nome em português vazio`);
    if (isBlank(entry.source)) errors.push(`${label}: fonte vazia`);
    if (typeof entry.attunement !== "boolean") errors.push(`${label}: attunement deve ser booleano`);
    if (!isString(entry.url) || !entry.url.startsWith(AIDEDD_BASE_URL)) {
      errors.push(`${label}: URL fora do AideDD`);
    }
    const expectedConsumable = entry.type === "potion" || entry.type === "scroll";
    if (typeIsValid && entry.consumable !== expectedConsumable) {
      errors.push(`${label}: consumable deve ser ${expectedConsumable}`);
    }
  });

  return errors;
}
