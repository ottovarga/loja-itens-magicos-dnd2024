import { describe, expect, it } from "vitest";
import {
  attachPtNames,
  expandRow,
  mapType,
  mergeNameKeys,
  parseListHtml,
  parsePlusVariants,
  type RawRow,
} from "./parse";

function row(slug: string, name: string, type: string, rarity: string, attunement: boolean) {
  return (
    `<tr><td class='nocel'><input type='checkbox' name='select_item[]' value="'${slug}'"></td>` +
    `<td class='item'><a href='/magic-item/${slug}' target='_blank'>${name}</a></td>` +
    `<td class='nocel'> <div class='trad'>FR</div></td><td class='nocel'></td>` +
    `<td class="colT"><span class='tag1'>${type}</span</td>` +
    `<td class="colR" data-sort-value="2"><span class='tag2'>${rarity}</span</td>` +
    `<td class="colL">${attunement ? "Attunement" : ""}</td>` +
    `<td class='colS'><span class='tagS'>Dungeon Master´s Guide 2024</span></td></tr>`
  );
}

const HTML =
  `<table id='liste' class='liste'><thead><tr><th>Magic Item</th></tr></thead><tbody>` +
  row("adamantine-weapon", "Adamantine Weapon", "Weapon ", "Uncommon", false) +
  row("amulet-of-health", "Amulet of Health", "Wondrous Item", "Rare", true) +
  row("quaal-s-feather-token", "Quaal&#039;s Feather Token", "Wondrous Item", "Rarity Varies", false) +
  `</tbody></table>`;

describe("parseListHtml", () => {
  it("extrai uma linha por item e ignora o cabeçalho", () => {
    expect(parseListHtml(HTML).map((r) => r.slug)).toEqual([
      "adamantine-weapon",
      "amulet-of-health",
      "quaal-s-feather-token",
    ]);
  });

  it("extrai nome, tipo sem espaços, raridade e sintonização", () => {
    expect(parseListHtml(HTML)[1]).toEqual({
      slug: "amulet-of-health",
      nameEn: "Amulet of Health",
      typeRaw: "Wondrous Item",
      rarityRaw: "Rare",
      attunement: true,
    });
    expect(parseListHtml(HTML)[0].typeRaw).toBe("Weapon");
  });

  it("decodifica entidades HTML no nome", () => {
    expect(parseListHtml(HTML)[2].nameEn).toBe("Quaal's Feather Token");
  });
});

describe("mapType", () => {
  it("converte o tipo do AideDD", () => {
    expect(mapType("Wondrous Item")).toBe("wondrous");
    expect(mapType("Staff")).toBe("staff");
  });

  it("lança erro para tipo desconhecido", () => {
    expect(() => mapType("Shield")).toThrow(/Shield/);
  });
});

describe("parsePlusVariants", () => {
  it("lê raridades por bônus", () => {
    expect(parsePlusVariants("Uncommon (+1), Rare (+2), or Very Rare (+3)")).toEqual([
      { bonus: 1, rarity: "uncommon" },
      { bonus: 2, rarity: "rare" },
      { bonus: 3, rarity: "very_rare" },
    ]);
  });

  it("devolve null quando não há bônus", () => {
    expect(parsePlusVariants("Rare")).toBeNull();
  });
});

const base: RawRow = {
  slug: "amulet-of-health",
  nameEn: "Amulet of Health",
  typeRaw: "Wondrous Item",
  rarityRaw: "Rare",
  attunement: true,
};

describe("expandRow", () => {
  it("item de raridade única vira um item do catálogo", () => {
    expect(expandRow(base, {})).toEqual([
      {
        id: "amulet-of-health",
        nameEn: "Amulet of Health",
        type: "wondrous",
        rarity: "rare",
        attunement: true,
        source: "DMG 2024",
        url: "https://www.aidedd.org/magic-item/amulet-of-health",
        consumable: false,
      },
    ]);
  });

  it("marca poções e pergaminhos como consumíveis", () => {
    const potion = { ...base, slug: "potion-of-heroism", typeRaw: "Potion" };
    expect(expandRow(potion, {})[0].consumable).toBe(true);
  });

  it("separa itens +1/+2/+3 em variantes", () => {
    const armor: RawRow = {
      slug: "armor-1-2-or-3",
      nameEn: "Armor, +1, +2, or +3",
      typeRaw: "Armor",
      rarityRaw: "Rare (+1), Very Rare (+2), or Legendary (+3)",
      attunement: false,
    };
    expect(expandRow(armor, {}).map((i) => [i.id, i.nameEn, i.rarity])).toEqual([
      ["armor-1-2-or-3--plus-1", "Armor +1", "rare"],
      ["armor-1-2-or-3--plus-2", "Armor +2", "very_rare"],
      ["armor-1-2-or-3--plus-3", "Armor +3", "legendary"],
    ]);
  });

  it("usa a tabela manual quando o item está nela", () => {
    const horn: RawRow = { ...base, slug: "horn-of-valhalla", rarityRaw: "Rare (Silver or Brass)" };
    const manual = { "horn-of-valhalla": [{ key: "iron", nameEn: "Horn of Valhalla (Iron)", rarity: "legendary" as const }] };
    expect(expandRow(horn, manual)).toMatchObject([
      { id: "horn-of-valhalla--iron", nameEn: "Horn of Valhalla (Iron)", rarity: "legendary" },
    ]);
  });

  it("lança erro com o slug quando a raridade não é reconhecida", () => {
    expect(() => expandRow({ ...base, rarityRaw: "Rarity Varies" }, {})).toThrow(/amulet-of-health/);
  });
});

describe("nomes em português", () => {
  it("attachPtNames preenche namePt e deixa vazio quando falta tradução", () => {
    const items = expandRow(base, {});
    expect(attachPtNames(items, { "amulet-of-health": "Amuleto da Saúde" })[0].namePt).toBe(
      "Amuleto da Saúde",
    );
    expect(attachPtNames(items, {})[0].namePt).toBe("");
  });

  it("attachPtNames grava as chaves na ordem do catálogo", () => {
    const [item] = attachPtNames(expandRow(base, {}), {});
    expect(Object.keys(item)).toEqual([
      "id",
      "nameEn",
      "namePt",
      "type",
      "rarity",
      "attunement",
      "source",
      "url",
      "consumable",
    ]);
  });

  it("mergeNameKeys acrescenta ids novos vazios, mantém traduções e ordena", () => {
    expect(mergeNameKeys({ b: "Bê" }, ["c", "a", "b"])).toEqual({ a: "", b: "Bê", c: "" });
    expect(Object.keys(mergeNameKeys({ b: "Bê" }, ["c", "a", "b"]))).toEqual(["a", "b", "c"]);
  });
});
