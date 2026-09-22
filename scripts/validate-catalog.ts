import { readFile } from "node:fs/promises";
import { validateCatalog } from "../src/lib/catalogValidation";

async function main() {
  const raw: unknown = JSON.parse(await readFile("src/data/items.json", "utf8"));
  if (!Array.isArray(raw)) {
    console.error("src/data/items.json deve conter uma lista.");
    process.exit(1);
  }
  const errors = validateCatalog(raw);
  if (errors.length > 0) {
    console.error(`${errors.length} problema(s) no catálogo:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Catálogo válido: ${raw.length} itens.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
