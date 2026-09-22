import { mkdir, readFile, writeFile } from "node:fs/promises";
import { attachPtNames, expandRow, mergeNameKeys, parseListHtml } from "./aidedd/parse";
import { MANUAL_VARIANTS } from "./aidedd/variants";
import { AIDEDD_BASE_URL } from "../src/lib/catalogValidation";

const NAMES_FILE = "scripts/aidedd/names-pt.json";
const OUTPUT_FILE = "src/data/items.json";
const PAGE_LIMIT = 400;

function requestBody(): URLSearchParams {
  const body = new URLSearchParams();
  body.append("limit", String(PAGE_LIMIT));
  body.append("page", "1");
  body.append("filtrer", "FILTER");
  for (const type of ["Armor", "Potion", "Ring", "Rod", "Scroll", "Staff", "Wand", "Weapon", "Wondrous item"]) {
    body.append("Filtre1[]", type);
  }
  for (const rarity of ["C", "NC", "R", "TR", "L", "A"]) body.append("Filtre2[]", rarity);
  body.append("source[]", "dmg");
  return body;
}

async function readNames(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(NAMES_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function main() {
  const response = await fetch(AIDEDD_BASE_URL, {
    method: "POST",
    body: requestBody(),
    headers: { "User-Agent": "loja-itens-magicos-dnd2024 catalog script" },
  });
  if (!response.ok) throw new Error(`AideDD respondeu ${response.status}`);

  const rows = parseListHtml(await response.text());
  if (rows.length < 300) throw new Error(`Só ${rows.length} linhas. O formato da página mudou?`);
  if (rows.length >= PAGE_LIMIT) {
    throw new Error(`${rows.length} linhas: a lista pode ter passado de uma página. Implemente paginação.`);
  }

  const scraped = rows.flatMap((row) => expandRow(row, MANUAL_VARIANTS));
  const names = mergeNameKeys(await readNames(), scraped.map((item) => item.id));
  const items = attachPtNames(scraped, names).sort((a, b) => a.id.localeCompare(b.id));

  await writeFile(NAMES_FILE, `${JSON.stringify(names, null, 2)}\n`);
  await mkdir("src/data", { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(items, null, 2)}\n`);

  const missing = items.filter((item) => item.namePt === "").length;
  console.log(`${rows.length} linhas do AideDD → ${items.length} itens em ${OUTPUT_FILE}.`);
  console.log(`${missing} itens sem nome em português (preencha ${NAMES_FILE}).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
