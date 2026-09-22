# Loja de Itens Mágicos D&D 2024 — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir o app web em que o mestre cria lojas de itens mágicos, sorteia itens reais do DMG 2024, edita a lista, registra local, NPCs e anotações, e guarda tudo no navegador.

**Architecture:** Next.js (App Router) sem backend, publicado na Vercel. Toda a regra de negócio fica em `src/lib/` como funções puras (RNG, relógio, IDs e `Storage` injetados), cobertas por Vitest. Componentes React em `src/components/` só chamam essas funções e renderizam; um `ShopsProvider` guarda o estado em memória e grava no `localStorage` com debounce. O catálogo `src/data/items.json` é gerado uma vez por um script que lê a lista do AideDD.

**Tech Stack:** Next.js, React, TypeScript `strict`, Tailwind CSS v4, Vitest, Testing Library, jsdom, `tsx` para scripts.

**Documentos obrigatórios antes de começar:**
- `CLAUDE.md` (regras de TDD, arquitetura e domínio). Leia inteiro.
- `docs/plans/2026-09-22-loja-itens-magicos-design.md` (design aprovado). Este plano implementa esse design. Se algo aqui parecer contradizer o design, pare e pergunte.

---

## Como usar este plano

- Siga as tarefas na ordem. Cada tarefa termina com um commit.
- Todo código de produção nasce de um teste que falhou antes (ver `CLAUDE.md`). Quando uma tarefa diz "rode e veja falhar", rode de verdade e confira a mensagem. Se falhar por erro de import ou sintaxe, corrija o teste antes de seguir.
- Comandos estão em sintaxe Bash (Git Bash no Windows). Rode tudo na raiz do projeto.
- Para rodar um único teste: `npx vitest run <arquivo> -t "<trecho do nome>"`.
- Ao fim de cada fase, rode `npm run test:run && npm run typecheck && npm run lint`. Tudo precisa passar.
- Nomes de testes em português. Código em inglês. Textos da interface em português.

## Fatos sobre o AideDD (levantados em 2026-09-22)

O script de catálogo depende destes fatos. Se o site mudou, ajuste o parser e os testes juntos.

- A lista fica em `https://www.aidedd.org/magic-item/`. Um GET devolve só 100 linhas. Um POST com `limit=400` e os filtros do formulário devolve tudo de uma vez.
- Filtrando `source[]=dmg`, vêm **350** itens (o design estimou ~400).
- Cada item é uma linha `<tr>` com:
  - `href='/magic-item/<slug>'` e o nome em inglês dentro do `<a>`;
  - `<span class='tag1'>Armor </span` (tipo; note o espaço sobrando e o `</span` sem `>`);
  - `<span class='tag2'>Rare</span` (raridade);
  - `<td class="colL">Attunement</td>` ou `<td class="colL"></td>`;
  - `<span class='tagS'>Dungeon Master´s Guide 2024</span>` (às vezes com sufixo ` (BR)`).
- Tipos encontrados: `Armor`, `Potion`, `Ring`, `Rod`, `Scroll`, `Staff`, `Wand`, `Weapon`, `Wondrous Item`.
- Raridades simples: `Common`, `Uncommon`, `Rare`, `Very Rare`, `Legendary`, `Artifact`.
- 19 itens têm raridade variável:
  - Padrão `+1/+2/+3` (o parser trata sozinho): `ammunition-1-2-or-3`, `armor-1-2-or-3`, `shield-1-2-or-3`, `weapon-1-2-or-3`, `wand-of-the-war-mage-1-2-or-3`, `rod-of-the-pact-keeper`, `wraps-of-unarmed-power`. O texto é, por exemplo, `Uncommon (+1), Rare (+2), or Very Rare (+3)` e o nome é `Armor, +1, +2, or +3`.
  - `Rarity Varies` ou texto especial (tabela manual, Tarefa 15): `belt-of-giant-strength`, `enspelled-armor`, `enspelled-staff`, `enspelled-weapon`, `figurine-of-wondrous-power`, `horn-of-valhalla`, `instrument-of-the-bards`, `ioun-stone`, `potion-of-giant-strength`, `potions-of-healing`, `quaal-s-feather-token`, `spell-scroll`.
- O AideDD não traz nome em português (só FR e ES). Os nomes em PT vêm de um arquivo mantido à mão (Tarefa 17).

## Decisões de implementação que o design deixou em aberto

Estas escolhas não contradizem o design, mas precisam ser consistentes em todo o código:

1. `CatalogItem` ganha o campo `source: string`, porque o `CLAUDE.md` manda guardar a fonte.
2. `GenConfig.typeWeights` é `Partial<Record<ItemType, number>>`. Com `typeWeights` presente, tipo com peso 0 ou sem peso não é sorteado.
3. O percentual geral da loja é `shop.lastConfig?.generalMod ?? 0`.
4. `rarityCounts.artifact` é ignorado quando `includeArtifacts` está desligado. Nesse caso não há aviso de falta.
5. Artefatos entram com `priceMods.random = 0`, porque percentuais não se aplicam a eles.
6. `+ Manual` de um item que já está na loja soma 1 à quantidade. Não cria linha repetida.
7. `vendido` fica entre 0 e a quantidade.
8. Preço final nunca é negativo (mínimo 0).
9. Importar em modo "mesclar": loja com o mesmo `id` é substituída pela importada; as demais são acrescentadas.
10. Dados corrompidos em `lojinha:v1` não são sobrescritos. O app mostra aviso e não grava até o usuário importar ou restaurar um backup.
11. Chips do card usam as siglas do design: `C`, `U`, `R`, `VR`, `L`, `A`, contando linhas (itens distintos), não quantidade.
12. Preços na interface usam "PO" (peças de ouro), com separador de milhar pt-BR: `4.000 PO`.

---

# Fase 0 — Projeto

### Tarefa 1: Criar o projeto Next.js e o repositório git

**Files:**
- Create: todo o esqueleto do Next.js na raiz
- Keep: `CLAUDE.md`, `docs/`

**Step 1: Gerar o esqueleto numa pasta temporária**

O `create-next-app` recusa pastas com `CLAUDE.md`. Gere ao lado e copie.

```bash
cd ..
npx create-next-app@latest lojinha-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
cp -r lojinha-scaffold/. "Lojinha rpg"/
rm -rf lojinha-scaffold
cd "Lojinha rpg"
```

Expected: a raiz tem `package.json`, `src/app/`, `CLAUDE.md` e `docs/` intactos.

**Step 2: Confirmar que o esqueleto roda**

```bash
npm run build
```

Expected: build conclui sem erros.

**Step 3: Iniciar o git e ligar o remoto**

```bash
git init -b main
git remote add origin https://github.com/ottovarga/loja-itens-magicos-dnd2024.git
git add -A
git commit -m "chore: scaffold Next.js app"
```

Não faça `push` sem pedir ao usuário.

---

### Tarefa 2: Configurar Vitest, Testing Library e scripts

**Files:**
- Create: `vitest.config.mts`
- Create: `vitest.setup.ts`
- Create: `src/lib/smoke.test.ts` (apagado no fim da tarefa)
- Modify: `package.json` (scripts)

**Step 1: Instalar dependências**

```bash
npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom tsx
```

**Step 2: Criar `vitest.config.mts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
});
```

**Step 3: Criar `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

**Step 4: Adicionar scripts ao `package.json`**

Dentro de `"scripts"`, mantenha `dev`, `build`, `start` e `lint` do esqueleto e acrescente:

```json
"test": "vitest",
"test:run": "vitest run",
"typecheck": "tsc --noEmit",
"catalog:scrape": "tsx scripts/scrape-aidedd.ts",
"catalog:validate": "tsx scripts/validate-catalog.ts"
```

**Step 5: Teste de fumaça que falha**

`src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("ambiente de testes", () => {
  it("roda testes do Vitest", () => {
    expect(1 + 1).toBe(3);
  });
});
```

Run: `npm run test:run`
Expected: FAIL, `expected 2 to be 3`. Isso prova que o Vitest roda.

**Step 6: Corrigir para `toBe(2)` e rodar**

Run: `npm run test:run`
Expected: PASS, 1 teste.

**Step 7: Apagar o teste de fumaça e conferir o resto**

```bash
rm src/lib/smoke.test.ts
npm run typecheck && npm run lint
```

Expected: sem erros. (`vitest run` sem testes sai com código 1; tudo bem até a próxima tarefa.)

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest, Testing Library and scripts"
```

---

# Fase 1 — Domínio em `src/lib/`

### Tarefa 3: Tipos do domínio

Tipos não têm comportamento; não há teste. O `typecheck` valida.

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Escrever os tipos**

```ts
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
```

**Step 2: Checar**

Run: `npm run typecheck`
Expected: sem erros.

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add domain types"
```

---

### Tarefa 4: Utilitários de aleatoriedade (`random.ts`)

**Files:**
- Create: `src/lib/random.ts`
- Create: `src/lib/random.test.ts`
- Create: `src/lib/__fixtures__/rng.ts`

**Step 1: Criar o helper de sequência fixa para testes**

`src/lib/__fixtures__/rng.ts`:

```ts
import type { Rng } from "../random";

/** Devolve os valores na ordem dada e recomeça do início quando acabam. */
export function seq(...values: number[]): Rng {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i++;
    return value;
  };
}
```

**Step 2: Escrever os testes que falham**

`src/lib/random.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mulberry32, pickOne, pickWeighted, randomInt } from "./random";
import { seq } from "./__fixtures__/rng";

describe("mulberry32", () => {
  it("gera a mesma sequência para a mesma seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gera valores em [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("devolve o mínimo quando o rng devolve 0", () => {
    expect(randomInt(seq(0), 2, 5)).toBe(2);
  });

  it("devolve o máximo quando o rng devolve quase 1", () => {
    expect(randomInt(seq(0.9999), 2, 5)).toBe(5);
  });
});

describe("pickOne", () => {
  it("escolhe pelo índice proporcional ao rng", () => {
    expect(pickOne(seq(0.5), ["a", "b", "c", "d"])).toBe("c");
  });

  it("lança erro com lista vazia", () => {
    expect(() => pickOne(seq(0), [])).toThrow();
  });
});

describe("pickWeighted", () => {
  it("respeita os pesos", () => {
    const entries = [
      ["a", 1],
      ["b", 3],
    ] as const;
    expect(pickWeighted(seq(0.2), entries)).toBe("a");
    expect(pickWeighted(seq(0.3), entries)).toBe("b");
  });

  it("nunca escolhe peso zero", () => {
    const entries = [
      ["a", 0],
      ["b", 1],
    ] as const;
    expect(pickWeighted(seq(0), entries)).toBe("b");
  });
});
```

**Step 3: Rodar e ver falhar**

Run: `npx vitest run src/lib/random.test.ts`
Expected: FAIL, `Failed to resolve import "./random"`. Crie o arquivo vazio `src/lib/random.ts` com `export type Rng = () => number;` e rode de novo: agora falha porque as funções não existem (`is not a function`). Esse é o motivo certo.

**Step 4: Implementar**

`src/lib/random.ts`:

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro em [min, max], limites inclusos. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickOne: lista vazia");
  return items[Math.floor(rng() * items.length)];
}

export function pickWeighted<T>(
  rng: Rng,
  entries: readonly (readonly [T, number])[],
): T {
  const positive = entries.filter(([, weight]) => weight > 0);
  const total = positive.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) throw new Error("pickWeighted: nenhum peso positivo");
  let r = rng() * total;
  for (const [value, weight] of positive) {
    if (r < weight) return value;
    r -= weight;
  }
  return positive[positive.length - 1][0];
}
```

**Step 5: Rodar**

Run: `npx vitest run src/lib/random.test.ts`
Expected: PASS, 8 testes.

**Step 6: Commit**

```bash
git add src/lib/random.ts src/lib/random.test.ts src/lib/__fixtures__/rng.ts
git commit -m "feat: add seeded RNG and pick helpers"
```

---

### Tarefa 5: Preço (`pricing.ts`)

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/pricing.test.ts`

**Step 1: Testes de preço base (falham)**

`src/lib/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { basePrice, finalPrice } from "./pricing";
import type { Rarity } from "./types";

const noMods = { priceMods: { random: 0, individual: 0 } };

describe("basePrice", () => {
  it.each<[Rarity, number]>([
    ["common", 100],
    ["uncommon", 400],
    ["rare", 4000],
    ["very_rare", 40000],
    ["legendary", 200000],
  ])("item %s custa %i PO", (rarity, expected) => {
    expect(basePrice({ rarity, consumable: false })).toBe(expected);
  });

  it("poções e pergaminhos custam metade do preço base", () => {
    expect(basePrice({ rarity: "rare", consumable: true })).toBe(2000);
  });

  it("artefato não tem preço base", () => {
    expect(basePrice({ rarity: "artifact", consumable: false })).toBeNull();
  });
});
```

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: FAIL, `Failed to resolve import "./pricing"`. Crie `src/lib/pricing.ts` vazio e confirme que agora falha com `basePrice is not a function`.

**Step 2: Implementar `basePrice`**

```ts
import type { CatalogItem, Rarity, ShopItem } from "./types";

export const BASE_PRICE: Record<Exclude<Rarity, "artifact">, number> = {
  common: 100,
  uncommon: 400,
  rare: 4000,
  very_rare: 40000,
  legendary: 200000,
};

export function basePrice(
  item: Pick<CatalogItem, "rarity" | "consumable">,
): number | null {
  if (item.rarity === "artifact") return null;
  const base = BASE_PRICE[item.rarity];
  return item.consumable ? base / 2 : base;
}
```

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: PASS.

**Step 3: Testes de preço final (falham)**

Acrescente ao arquivo de teste:

```ts
describe("finalPrice", () => {
  const rare = { rarity: "rare" as const, consumable: false };

  it("sem percentuais devolve o preço base", () => {
    expect(finalPrice(rare, noMods, 0)).toBe(4000);
  });

  it.each([
    // random, geral, individual, esperado
    [10, 0, 0, 4400],
    [0, -25, 0, 3000],
    [0, 0, 50, 6000],
    [10, 10, 10, 5324],
    [-10, 20, -5, 4104],
  ])(
    "compõe random %i%%, geral %i%% e individual %i%% em %i PO",
    (random, general, individual, expected) => {
      expect(
        finalPrice(rare, { priceMods: { random, individual } }, general),
      ).toBe(expected);
    },
  );

  it("arredonda para PO inteiro", () => {
    const common = { rarity: "common" as const, consumable: true };
    expect(
      finalPrice(common, { priceMods: { random: 3, individual: 0 } }, 0),
    ).toBe(52);
  });

  it("priceOverride substitui todo o cálculo", () => {
    expect(
      finalPrice(
        rare,
        { priceMods: { random: 10, individual: 10 }, priceOverride: 123 },
        50,
      ),
    ).toBe(123);
  });

  it("artefato sem priceOverride não tem preço", () => {
    const artifact = { rarity: "artifact" as const, consumable: false };
    expect(
      finalPrice(artifact, { priceMods: { random: 0, individual: 50 } }, 50),
    ).toBeNull();
  });

  it("artefato com priceOverride usa o valor manual sem percentuais", () => {
    const artifact = { rarity: "artifact" as const, consumable: false };
    expect(
      finalPrice(
        artifact,
        { priceMods: { random: 0, individual: 50 }, priceOverride: 900000 },
        50,
      ),
    ).toBe(900000);
  });

  it("nunca fica negativo", () => {
    expect(
      finalPrice(rare, { priceMods: { random: 0, individual: -150 } }, 0),
    ).toBe(0);
  });
});
```

Conta de conferência: `4000 × 0,9 × 1,2 × 0,95 = 4104`; `50 × 1,03 = 51,5 → 52`.

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: FAIL, `finalPrice is not a function`.

**Step 4: Implementar `finalPrice`**

```ts
export function finalPrice(
  item: Pick<CatalogItem, "rarity" | "consumable">,
  shopItem: Pick<ShopItem, "priceMods" | "priceOverride">,
  generalMod: number,
): number | null {
  if (shopItem.priceOverride !== undefined) return shopItem.priceOverride;
  const base = basePrice(item);
  if (base === null) return null;
  const { random, individual } = shopItem.priceMods;
  const price =
    base * (1 + random / 100) * (1 + generalMod / 100) * (1 + individual / 100);
  return Math.max(0, Math.round(price));
}
```

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: PASS.

**Step 5: Formatação de preço (teste primeiro)**

Acrescente ao teste:

```ts
import { formatGp } from "./pricing";

describe("formatGp", () => {
  it("usa separador de milhar pt-BR e sufixo PO", () => {
    expect(formatGp(40000)).toBe("40.000 PO");
  });

  it("mostra travessão quando não há preço", () => {
    expect(formatGp(null)).toBe("—");
  });
});
```

Run e veja falhar (`formatGp is not a function`). Implemente:

```ts
const gpFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatGp(value: number | null): string {
  return value === null ? "—" : `${gpFormatter.format(value)} PO`;
}
```

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat: add price calculation"
```

---

### Tarefa 6: Catálogo de fixture e filtros (`catalog.ts`)

**Files:**
- Create: `src/lib/__fixtures__/catalog.ts`
- Create: `src/lib/__fixtures__/config.ts`
- Create: `src/lib/catalog.ts`
- Create: `src/lib/catalog.test.ts`

**Step 1: Catálogo de fixture**

Este catálogo controla exatamente o que existe por tipo e raridade. Não use `items.json` nos testes de lógica.

`src/lib/__fixtures__/catalog.ts`:

```ts
import type { CatalogItem, ItemType, Rarity } from "../types";

function item(
  id: string,
  type: ItemType,
  rarity: Rarity,
  extra: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    id,
    nameEn: id,
    namePt: id,
    type,
    rarity,
    attunement: false,
    source: "DMG 2024",
    url: `https://www.aidedd.org/magic-item/${id}`,
    consumable: type === "potion" || type === "scroll",
    ...extra,
  };
}

/**
 * Por raridade:
 * - common: 1 poção, 1 pergaminho, 2 maravilhosos
 * - uncommon: 2 maravilhosos, 1 arma, 1 poção
 * - rare: 1 armadura, 1 anel
 * - very_rare: 1 maravilhoso
 * - legendary: 1 arma
 * - artifact: 1 arma, 1 maravilhoso
 */
export const fixtureCatalog: CatalogItem[] = [
  item("potion-of-healing", "potion", "common", {
    nameEn: "Potion of Healing",
    namePt: "Poção de Cura",
  }),
  item("spell-scroll-cantrip", "scroll", "common", {
    nameEn: "Spell Scroll (Cantrip)",
    namePt: "Pergaminho de Magia (Truque)",
  }),
  item("common-wondrous-1", "wondrous", "common"),
  item("common-wondrous-2", "wondrous", "common"),
  item("bag-of-holding", "wondrous", "uncommon", {
    nameEn: "Bag of Holding",
    namePt: "Bolsa Guarda-Tudo",
  }),
  item("uncommon-wondrous-2", "wondrous", "uncommon"),
  item("weapon-plus-1", "weapon", "uncommon", {
    nameEn: "Weapon +1",
    namePt: "Arma +1",
  }),
  item("potion-of-healing-greater", "potion", "uncommon"),
  item("armor-plus-1", "armor", "rare"),
  item("ring-of-protection", "ring", "rare", { attunement: true }),
  item("very-rare-wondrous", "wondrous", "very_rare"),
  item("legendary-weapon", "weapon", "legendary"),
  item("axe-of-the-dwarvish-lords", "weapon", "artifact"),
  item("orb-of-dragonkind", "wondrous", "artifact"),
];
```

`src/lib/__fixtures__/config.ts`:

```ts
import { ITEM_TYPES, type GenConfig, type Rarity } from "../types";

export function counts(
  partial: Partial<Record<Rarity, number>>,
): Record<Rarity, number> {
  return {
    common: 0,
    uncommon: 0,
    rare: 0,
    very_rare: 0,
    legendary: 0,
    artifact: 0,
    ...partial,
  };
}

export function makeConfig(overrides: Partial<GenConfig> = {}): GenConfig {
  return {
    rarityCounts: counts({}),
    types: [...ITEM_TYPES],
    allowRepeat: false,
    qtyRange: { potion: [1, 1], scroll: [1, 1] },
    randomVariance: 0,
    generalMod: 0,
    includeArtifacts: false,
    ...overrides,
  };
}
```

**Step 2: Testes de `eligibleItems` (falham)**

`src/lib/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { eligibleItems, indexCatalog, searchCatalog } from "./catalog";
import { fixtureCatalog } from "./__fixtures__/catalog";

const ids = (items: { id: string }[]) => items.map((i) => i.id).sort();

describe("eligibleItems", () => {
  it("filtra pela raridade", () => {
    expect(
      ids(eligibleItems(fixtureCatalog, { rarity: "rare", types: ["armor", "ring"] })),
    ).toEqual(["armor-plus-1", "ring-of-protection"]);
  });

  it("filtra pelos tipos marcados", () => {
    expect(
      ids(eligibleItems(fixtureCatalog, { rarity: "uncommon", types: ["weapon"] })),
    ).toEqual(["weapon-plus-1"]);
  });

  it("devolve lista vazia quando nenhum tipo está marcado", () => {
    expect(eligibleItems(fixtureCatalog, { rarity: "common", types: [] })).toEqual([]);
  });
});
```

Run: `npx vitest run src/lib/catalog.test.ts`
Expected: FAIL por import não resolvido. Crie `src/lib/catalog.ts` vazio; confirme falha `eligibleItems is not a function`.

**Step 3: Implementar**

```ts
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
```

Run: PASS.

**Step 4: Testes de `indexCatalog` e `searchCatalog` (falham)**

```ts
describe("indexCatalog", () => {
  it("indexa itens pelo id", () => {
    const index = indexCatalog(fixtureCatalog);
    expect(index.get("bag-of-holding")?.namePt).toBe("Bolsa Guarda-Tudo");
  });
});

describe("searchCatalog", () => {
  it("busca pelo nome em português ignorando acentos e caixa", () => {
    expect(ids(searchCatalog(fixtureCatalog, "POCAO"))).toEqual(["potion-of-healing"]);
  });

  it("busca pelo nome em inglês", () => {
    expect(ids(searchCatalog(fixtureCatalog, "bag of"))).toEqual(["bag-of-holding"]);
  });

  it("filtra por raridade", () => {
    expect(
      ids(searchCatalog(fixtureCatalog, "", { rarities: ["rare"] })),
    ).toEqual(["armor-plus-1", "ring-of-protection"]);
  });

  it("filtra por tipo", () => {
    expect(
      ids(searchCatalog(fixtureCatalog, "", { types: ["ring"] })),
    ).toEqual(["ring-of-protection"]);
  });

  it("ordena pelo nome em português", () => {
    const names = searchCatalog(fixtureCatalog, "").map((i) => i.namePt);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });
});
```

Run e veja falhar. Implemente:

```ts
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
```

Run: `npx vitest run src/lib/catalog.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/catalog.ts src/lib/catalog.test.ts src/lib/__fixtures__
git commit -m "feat: add catalog filters, index and search"
```

---

### Tarefa 7: Rótulos em português (`labels.ts`)

**Files:**
- Create: `src/lib/labels.ts`
- Create: `src/lib/labels.test.ts`

**Step 1: Teste que falha**

```ts
import { describe, expect, it } from "vitest";
import { RARITY_LABEL, RARITY_SHORT, TYPE_LABEL } from "./labels";
import { ITEM_TYPES, RARITIES } from "./types";

describe("rótulos", () => {
  it("tem rótulo em português para toda raridade", () => {
    for (const r of RARITIES) expect(RARITY_LABEL[r]).toBeTruthy();
    expect(RARITY_LABEL.very_rare).toBe("Muito Raro");
  });

  it("tem sigla para toda raridade", () => {
    expect(RARITIES.map((r) => RARITY_SHORT[r])).toEqual(["C", "U", "R", "VR", "L", "A"]);
  });

  it("tem rótulo em português para todo tipo", () => {
    for (const t of ITEM_TYPES) expect(TYPE_LABEL[t]).toBeTruthy();
    expect(TYPE_LABEL.wondrous).toBe("Item Maravilhoso");
  });
});
```

Run e veja falhar pelo import.

**Step 2: Implementar**

```ts
import type { ItemType, Rarity } from "./types";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  very_rare: "Muito Raro",
  legendary: "Lendário",
  artifact: "Artefato",
};

export const RARITY_SHORT: Record<Rarity, string> = {
  common: "C",
  uncommon: "U",
  rare: "R",
  very_rare: "VR",
  legendary: "L",
  artifact: "A",
};

export const TYPE_LABEL: Record<ItemType, string> = {
  armor: "Armadura",
  potion: "Poção",
  ring: "Anel",
  rod: "Bastão",
  scroll: "Pergaminho",
  staff: "Cajado",
  wand: "Varinha",
  weapon: "Arma",
  wondrous: "Item Maravilhoso",
};
```

Run: PASS.

**Step 3: Commit**

```bash
git add src/lib/labels.ts src/lib/labels.test.ts
git commit -m "feat: add Portuguese labels for rarities and types"
```

---

### Tarefa 8: Gerador de itens (`generator.ts`)

O gerador cresce em nove passos (A a I), cada um com o seu teste vermelho. Todos os testes ficam em `src/lib/generator.test.ts`. Não pule a etapa de ver o teste falhar.

**Files:**
- Create: `src/lib/generator.ts`
- Create: `src/lib/generator.test.ts`

**Step 1: Cabeçalho do arquivo de teste**

`src/lib/generator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import { describeShortfalls, generateItems } from "./generator";
import { mulberry32, type Rng } from "./random";
import type { GenConfig, Rarity, ShopItem } from "./types";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { counts, makeConfig } from "./__fixtures__/config";
import { seq } from "./__fixtures__/rng";

const index = indexCatalog(fixtureCatalog);
const info = (s: ShopItem) => index.get(s.itemId)!;
const ofRarity = (items: ShopItem[], rarity: Rarity) =>
  items.filter((s) => info(s).rarity === rarity);
const totalQty = (items: ShopItem[]) => items.reduce((sum, s) => sum + s.qty, 0);

function run(
  config: GenConfig,
  opts: { existing?: ShopItem[]; rng?: Rng } = {},
) {
  return generateItems({
    catalog: fixtureCatalog,
    config,
    existing: opts.existing,
    rng: opts.rng ?? mulberry32(1),
  });
}

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
```

Enquanto `describeShortfalls` não existir (passo I), o import dele quebra o arquivo. Nos passos A a H, importe só `generateItems`; acrescente `describeShortfalls` ao import no passo I.

**Step 2 (A): contagem por raridade e tipos marcados — testes que falham**

```ts
describe("generateItems — contagem e tipos", () => {
  it("gera a quantidade pedida de cada raridade", () => {
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 2, rare: 1 }) }));
    expect(ofRarity(items, "common")).toHaveLength(2);
    expect(ofRarity(items, "rare")).toHaveLength(1);
    expect(items).toHaveLength(3);
  });

  it("só sorteia itens dos tipos marcados", () => {
    for (const seed of SEEDS) {
      const { items } = run(
        makeConfig({ rarityCounts: counts({ common: 2, uncommon: 2 }), types: ["wondrous"] }),
        { rng: mulberry32(seed) },
      );
      expect(items.every((s) => info(s).type === "wondrous")).toBe(true);
    }
  });
});
```

Run: `npx vitest run src/lib/generator.test.ts`
Expected: FAIL por import não resolvido. Crie `src/lib/generator.ts` vazio e rode de novo: FAIL com `generateItems is not a function`.

**Step 3 (A): implementação mínima**

`src/lib/generator.ts`:

```ts
import { eligibleItems } from "./catalog";
import { pickOne, type Rng } from "./random";
import {
  RARITIES,
  type CatalogItem,
  type GenConfig,
  type GenerationResult,
  type ShopItem,
  type Shortfall,
} from "./types";

export interface GenerateInput {
  catalog: readonly CatalogItem[];
  config: GenConfig;
  existing?: readonly ShopItem[];
  rng: Rng;
}

export function generateItems({ catalog, config, rng }: GenerateInput): GenerationResult {
  const items: ShopItem[] = [];
  const shortfalls: Shortfall[] = [];
  for (const rarity of RARITIES) {
    const requested = config.rarityCounts[rarity];
    if (requested <= 0) continue;
    const pool = eligibleItems(catalog, { rarity, types: config.types });
    for (let n = 0; n < requested; n++) {
      addToShop(items, pickOne(rng, pool));
    }
  }
  return { items, shortfalls };
}

function addToShop(items: ShopItem[], item: CatalogItem): void {
  items.push({ itemId: item.id, qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 });
}
```

Run: PASS (2 testes).

**Step 4 (B): itens existentes e pool vazio — testes que falham**

```ts
describe("generateItems — lista existente e falta de itens", () => {
  it("preserva os itens que já estavam na loja", () => {
    const existing: ShopItem[] = [
      { itemId: "legendary-weapon", qty: 1, priceMods: { random: 5, individual: 0 }, sold: 0 },
    ];
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 1 }) }), { existing });
    expect(items[0]).toEqual(existing[0]);
    expect(items).toHaveLength(2);
  });

  it("gera o possível e avisa quando não há itens elegíveis, sem lançar erro", () => {
    const result = run(makeConfig({ rarityCounts: counts({ common: 2 }), types: ["ring"] }));
    expect(result.items).toEqual([]);
    expect(result.shortfalls).toEqual([{ rarity: "common", requested: 2, generated: 0 }]);
  });
});
```

Run: FAIL. O primeiro falha porque `items[0]` é o item novo; o segundo lança `pickOne: lista vazia`.

**Step 5 (B): implementação**

Troque o corpo de `generateItems` e acrescente `cloneShopItem`:

```ts
export function generateItems({
  catalog,
  config,
  existing = [],
  rng,
}: GenerateInput): GenerationResult {
  const items = existing.map(cloneShopItem);
  const shortfalls: Shortfall[] = [];
  for (const rarity of RARITIES) {
    const requested = config.rarityCounts[rarity];
    if (requested <= 0) continue;
    const pool = eligibleItems(catalog, { rarity, types: config.types });
    let generated = 0;
    for (let n = 0; n < requested; n++) {
      const available = pool;
      if (available.length === 0) break;
      addToShop(items, pickOne(rng, available));
      generated++;
    }
    if (generated < requested) shortfalls.push({ rarity, requested, generated });
  }
  return { items, shortfalls };
}

function cloneShopItem(item: ShopItem): ShopItem {
  return { ...item, priceMods: { ...item.priceMods } };
}
```

Run: PASS (4 testes).

**Step 6 (C): sem repetição — testes que falham**

```ts
describe("generateItems — allowRepeat desligado", () => {
  it("não repete itens quando allowRepeat está desligado", () => {
    for (const seed of SEEDS) {
      const { items } = run(makeConfig({ rarityCounts: counts({ uncommon: 4 }) }), {
        rng: mulberry32(seed),
      });
      expect(new Set(items.map((s) => s.itemId)).size).toBe(4);
    }
  });

  it("não repete itens que já estão na loja ao acrescentar", () => {
    const existing: ShopItem[] = [
      { itemId: "common-wondrous-1", qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 },
    ];
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"] }),
      { existing, rng: seq(0) },
    );
    expect(items.map((s) => s.itemId)).toEqual(["common-wondrous-1", "common-wondrous-2"]);
  });

  it("avisa quantos faltaram quando o pool se esgota", () => {
    const result = run(makeConfig({ rarityCounts: counts({ rare: 3 }), types: ["armor"] }));
    expect(result.items).toHaveLength(1);
    expect(result.shortfalls).toEqual([{ rarity: "rare", requested: 3, generated: 1 }]);
  });
});
```

Run: FAIL (itens repetidos; `seq(0)` escolhe `common-wondrous-1` de novo; o pool de armadura não se esgota).

**Step 7 (C): implementação**

Troque a linha `const available = pool;` por:

```ts
      const available = config.allowRepeat
        ? pool
        : pool.filter((item) => !items.some((s) => s.itemId === item.id));
```

Run: PASS (7 testes).

**Step 8 (D): repetição soma quantidade — testes que falham**

```ts
describe("generateItems — allowRepeat ligado", () => {
  it("soma a quantidade quando o item se repete", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 3 }), types: ["wondrous"], allowRepeat: true }),
      { rng: seq(0) },
    );
    expect(items).toEqual([
      { itemId: "common-wondrous-1", qty: 3, priceMods: { random: 0, individual: 0 }, sold: 0 },
    ]);
  });

  it("soma na linha existente da loja sem alterar a lista recebida", () => {
    const existing: ShopItem[] = [
      { itemId: "common-wondrous-1", qty: 2, priceMods: { random: 0, individual: 0 }, sold: 1 },
    ];
    const { items } = run(
      makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"], allowRepeat: true }),
      { existing, rng: seq(0) },
    );
    expect(items).toEqual([{ ...existing[0], qty: 3 }]);
    expect(existing[0].qty).toBe(2);
  });
});
```

Run: FAIL (várias linhas em vez de uma).

**Step 9 (D): implementação**

Troque `addToShop`:

```ts
function addToShop(items: ShopItem[], item: CatalogItem): void {
  const current = items.find((s) => s.itemId === item.id);
  if (current) {
    current.qty += 1;
    return;
  }
  items.push({ itemId: item.id, qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 });
}
```

Run: PASS (9 testes).

**Step 10 (E): quantidade de poções e pergaminhos — testes que falham**

A ordem de consumo do RNG em cada sorteio é: escolha do item, quantidade (só poção e pergaminho), variação de preço (só se ligada).

```ts
describe("generateItems — quantidade de consumíveis", () => {
  const potionConfig = (range: [number, number]) =>
    makeConfig({
      rarityCounts: counts({ common: 1 }),
      types: ["potion"],
      qtyRange: { potion: range, scroll: [1, 1] },
    });

  it("poção recebe o mínimo da faixa quando o rng devolve 0", () => {
    const { items } = run(potionConfig([2, 4]), { rng: seq(0, 0) });
    expect(items[0].qty).toBe(2);
  });

  it("poção recebe o máximo da faixa quando o rng devolve quase 1", () => {
    const { items } = run(potionConfig([2, 4]), { rng: seq(0, 0.9999) });
    expect(items[0].qty).toBe(4);
  });

  it("pergaminho usa a faixa de pergaminhos", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ common: 1 }),
        types: ["scroll"],
        qtyRange: { potion: [1, 1], scroll: [5, 5] },
      }),
    );
    expect(items[0].qty).toBe(5);
  });

  it("outros itens entram com quantidade 1", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ common: 2 }),
        types: ["wondrous"],
        qtyRange: { potion: [3, 3], scroll: [3, 3] },
      }),
    );
    expect(items.every((s) => s.qty === 1)).toBe(true);
  });
});
```

Run: FAIL (quantidade 1 em vez de 2, 4 e 5).

**Step 11 (E): implementação**

Importe `randomInt` de `./random`. Troque a chamada de `addToShop` e a própria função:

```ts
      addToShop(items, pickOne(rng, available), config, rng);
```

```ts
function rollQty(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (item.type === "potion") return randomInt(rng, ...config.qtyRange.potion);
  if (item.type === "scroll") return randomInt(rng, ...config.qtyRange.scroll);
  return 1;
}

function addToShop(items: ShopItem[], item: CatalogItem, config: GenConfig, rng: Rng): void {
  const qty = rollQty(rng, item, config);
  const current = items.find((s) => s.itemId === item.id);
  if (current) {
    current.qty += qty;
    return;
  }
  items.push({ itemId: item.id, qty, priceMods: { random: 0, individual: 0 }, sold: 0 });
}
```

Run: PASS (13 testes).

**Step 12 (F): variação aleatória de preço — testes que falham**

```ts
describe("generateItems — variação aleatória de preço", () => {
  const wondrous = (variance: number) =>
    makeConfig({ rarityCounts: counts({ common: 1 }), types: ["wondrous"], randomVariance: variance });

  it("fica em zero quando a variação está desligada", () => {
    const { items } = run(makeConfig({ rarityCounts: counts({ common: 2, rare: 2 }) }));
    expect(items.every((s) => s.priceMods.random === 0)).toBe(true);
  });

  it("chega a -v quando o rng devolve 0", () => {
    const { items } = run(wondrous(10), { rng: seq(0, 0) });
    expect(items[0].priceMods.random).toBe(-10);
  });

  it("chega a +v quando o rng devolve quase 1", () => {
    const { items } = run(wondrous(10), { rng: seq(0, 0.9999) });
    expect(items[0].priceMods.random).toBe(10);
  });

  it("é sempre inteiro entre -v e +v", () => {
    for (const seed of SEEDS) {
      const { items } = run(
        makeConfig({ rarityCounts: counts({ common: 4, uncommon: 4, rare: 2 }), randomVariance: 15 }),
        { rng: mulberry32(seed) },
      );
      for (const s of items) {
        expect(Number.isInteger(s.priceMods.random)).toBe(true);
        expect(Math.abs(s.priceMods.random)).toBeLessThanOrEqual(15);
      }
    }
  });
});
```

Run: FAIL nos testes de -v e +v. (Os outros dois já passam e documentam a regra.)

**Step 13 (F): implementação**

```ts
function rollRandomMod(rng: Rng, config: GenConfig): number {
  if (config.randomVariance <= 0) return 0;
  return randomInt(rng, -config.randomVariance, config.randomVariance);
}
```

Em `addToShop`, troque `priceMods: { random: 0, individual: 0 }` por `priceMods: { random: rollRandomMod(rng, config), individual: 0 }`.

Run: PASS (17 testes).

**Step 14 (G): artefatos — testes que falham**

```ts
describe("generateItems — artefatos", () => {
  it("deixa artefatos fora do sorteio por padrão, sem aviso", () => {
    const result = run(makeConfig({ rarityCounts: counts({ artifact: 2 }) }));
    expect(result.items).toEqual([]);
    expect(result.shortfalls).toEqual([]);
  });

  it("sorteia artefatos com includeArtifacts", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ artifact: 2 }), includeArtifacts: true }),
    );
    expect(ofRarity(items, "artifact")).toHaveLength(2);
  });

  it("artefatos não recebem variação aleatória de preço", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ artifact: 2 }), includeArtifacts: true, randomVariance: 20 }),
      { rng: seq(0) },
    );
    expect(items.every((s) => s.priceMods.random === 0)).toBe(true);
  });
});
```

Run: FAIL no primeiro e no terceiro. (O segundo já passa e documenta a regra.)

**Step 15 (G): implementação**

Em `generateItems`, logo após `if (requested <= 0) continue;`:

```ts
    if (rarity === "artifact" && !config.includeArtifacts) continue;
```

Troque `rollRandomMod` e a chamada dele para `rollRandomMod(rng, item, config)`:

```ts
function rollRandomMod(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (config.randomVariance <= 0 || item.rarity === "artifact") return 0;
  return randomInt(rng, -config.randomVariance, config.randomVariance);
}
```

Run: PASS (20 testes).

**Step 16 (H): pesos por tipo — testes que falham**

```ts
describe("generateItems — typeWeights", () => {
  it("sem typeWeights sorteia de forma uniforme entre os itens elegíveis", () => {
    const { items } = run(
      makeConfig({ rarityCounts: counts({ uncommon: 4000 }), allowRepeat: true }),
      { rng: mulberry32(42) },
    );
    expect(items).toHaveLength(4);
    for (const s of items) {
      expect(s.qty).toBeGreaterThan(900);
      expect(s.qty).toBeLessThan(1100);
    }
  });

  it("só sorteia tipos com peso positivo", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 20 }),
        allowRepeat: true,
        typeWeights: { weapon: 100, wondrous: 0 },
      }),
    );
    expect(items.map((s) => s.itemId)).toEqual(["weapon-plus-1"]);
  });

  it("ignora tipo sem itens na raridade", () => {
    const result = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 5 }),
        allowRepeat: true,
        typeWeights: { ring: 90, weapon: 10 },
      }),
    );
    expect(result.items.map((s) => s.itemId)).toEqual(["weapon-plus-1"]);
    expect(result.shortfalls).toEqual([]);
  });

  it("aproxima o percentual pedido", () => {
    const { items } = run(
      makeConfig({
        rarityCounts: counts({ uncommon: 2000 }),
        allowRepeat: true,
        typeWeights: { weapon: 50, wondrous: 50 },
      }),
      { rng: mulberry32(42) },
    );
    const weapons = totalQty(items.filter((s) => info(s).type === "weapon"));
    expect(weapons / totalQty(items)).toBeGreaterThan(0.45);
    expect(weapons / totalQty(items)).toBeLessThan(0.55);
  });

  it("avisa falta quando só sobram tipos sem peso", () => {
    const result = run(
      makeConfig({ rarityCounts: counts({ uncommon: 3 }), typeWeights: { weapon: 100 } }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.shortfalls).toEqual([{ rarity: "uncommon", requested: 3, generated: 1 }]);
  });
});
```

Run: o primeiro já passa (documenta o sorteio uniforme). Os outros FAIL.

**Step 17 (H): implementação**

Importe `pickWeighted` de `./random`. Filtre o pool pelos pesos e troque a escolha do item:

```ts
    const pool = eligibleItems(catalog, { rarity, types: config.types }).filter((item) =>
      hasWeight(config, item),
    );
```

```ts
      addToShop(items, pickItem(rng, available, config), config, rng);
```

```ts
function hasWeight(config: GenConfig, item: CatalogItem): boolean {
  return !config.typeWeights || (config.typeWeights[item.type] ?? 0) > 0;
}

function pickItem(rng: Rng, available: readonly CatalogItem[], config: GenConfig): CatalogItem {
  const weights = config.typeWeights;
  if (!weights) return pickOne(rng, available);
  const types = [...new Set(available.map((item) => item.type))];
  const type = pickWeighted(rng, types.map((t) => [t, weights[t] ?? 0] as const));
  return pickOne(rng, available.filter((item) => item.type === type));
}
```

Run: PASS (25 testes).

**Step 18 (I): mensagem de aviso — teste que falha**

Acrescente `describeShortfalls` ao import do teste e:

```ts
describe("describeShortfalls", () => {
  it("descreve quantos itens de cada raridade foram gerados", () => {
    expect(describeShortfalls([{ rarity: "rare", requested: 5, generated: 2 }])).toEqual([
      "Só 2 de 5 Raro disponíveis com esses filtros.",
    ]);
  });
});
```

Run: FAIL (`describeShortfalls` não exportado).

**Step 19 (I): implementação**

```ts
import { RARITY_LABEL } from "./labels";

export function describeShortfalls(shortfalls: readonly Shortfall[]): string[] {
  return shortfalls.map(
    (s) => `Só ${s.generated} de ${s.requested} ${RARITY_LABEL[s.rarity]} disponíveis com esses filtros.`,
  );
}
```

Run: PASS (26 testes).

**Step 20: Conferir o arquivo final**

`src/lib/generator.ts` deve ficar assim:

```ts
import { eligibleItems } from "./catalog";
import { RARITY_LABEL } from "./labels";
import { pickOne, pickWeighted, randomInt, type Rng } from "./random";
import {
  RARITIES,
  type CatalogItem,
  type GenConfig,
  type GenerationResult,
  type ShopItem,
  type Shortfall,
} from "./types";

export interface GenerateInput {
  catalog: readonly CatalogItem[];
  config: GenConfig;
  existing?: readonly ShopItem[];
  rng: Rng;
}

export function generateItems({
  catalog,
  config,
  existing = [],
  rng,
}: GenerateInput): GenerationResult {
  const items = existing.map(cloneShopItem);
  const shortfalls: Shortfall[] = [];
  for (const rarity of RARITIES) {
    const requested = config.rarityCounts[rarity];
    if (requested <= 0) continue;
    if (rarity === "artifact" && !config.includeArtifacts) continue;
    const pool = eligibleItems(catalog, { rarity, types: config.types }).filter((item) =>
      hasWeight(config, item),
    );
    let generated = 0;
    for (let n = 0; n < requested; n++) {
      const available = config.allowRepeat
        ? pool
        : pool.filter((item) => !items.some((s) => s.itemId === item.id));
      if (available.length === 0) break;
      addToShop(items, pickItem(rng, available, config), config, rng);
      generated++;
    }
    if (generated < requested) shortfalls.push({ rarity, requested, generated });
  }
  return { items, shortfalls };
}

export function describeShortfalls(shortfalls: readonly Shortfall[]): string[] {
  return shortfalls.map(
    (s) => `Só ${s.generated} de ${s.requested} ${RARITY_LABEL[s.rarity]} disponíveis com esses filtros.`,
  );
}

function cloneShopItem(item: ShopItem): ShopItem {
  return { ...item, priceMods: { ...item.priceMods } };
}

function hasWeight(config: GenConfig, item: CatalogItem): boolean {
  return !config.typeWeights || (config.typeWeights[item.type] ?? 0) > 0;
}

function pickItem(rng: Rng, available: readonly CatalogItem[], config: GenConfig): CatalogItem {
  const weights = config.typeWeights;
  if (!weights) return pickOne(rng, available);
  const types = [...new Set(available.map((item) => item.type))];
  const type = pickWeighted(rng, types.map((t) => [t, weights[t] ?? 0] as const));
  return pickOne(rng, available.filter((item) => item.type === type));
}

function rollQty(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (item.type === "potion") return randomInt(rng, ...config.qtyRange.potion);
  if (item.type === "scroll") return randomInt(rng, ...config.qtyRange.scroll);
  return 1;
}

function rollRandomMod(rng: Rng, item: CatalogItem, config: GenConfig): number {
  if (config.randomVariance <= 0 || item.rarity === "artifact") return 0;
  return randomInt(rng, -config.randomVariance, config.randomVariance);
}

function addToShop(items: ShopItem[], item: CatalogItem, config: GenConfig, rng: Rng): void {
  const qty = rollQty(rng, item, config);
  const current = items.find((s) => s.itemId === item.id);
  if (current) {
    current.qty += qty;
    return;
  }
  items.push({
    itemId: item.id,
    qty,
    priceMods: { random: rollRandomMod(rng, item, config), individual: 0 },
    sold: 0,
  });
}
```

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: tudo verde.

**Step 21: Commit**

```bash
git add src/lib/generator.ts src/lib/generator.test.ts
git commit -m "feat: add item generator with rarity counts, repeats, weights and shortfalls"
```

---

### Tarefa 9: Configuração padrão e saneamento (`config.ts`)

O formulário entrega números digitados pelo usuário. `sanitizeConfig` garante que o gerador só recebe valores válidos.

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/config.test.ts`

**Step 1: Testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { defaultGenConfig, sanitizeConfig } from "./config";
import { ITEM_TYPES } from "./types";
import { counts, makeConfig } from "./__fixtures__/config";

describe("defaultGenConfig", () => {
  it("usa faixas de 1–3 poções e 1–5 pergaminhos", () => {
    expect(defaultGenConfig().qtyRange).toEqual({ potion: [1, 3], scroll: [1, 5] });
  });

  it("marca todos os tipos, sem pesos e sem artefatos", () => {
    const config = defaultGenConfig();
    expect(config.types).toEqual([...ITEM_TYPES]);
    expect(config.typeWeights).toBeUndefined();
    expect(config.includeArtifacts).toBe(false);
    expect(config.rarityCounts.artifact).toBe(0);
  });
});

describe("sanitizeConfig", () => {
  it("troca contagens negativas por zero e arredonda decimais", () => {
    const result = sanitizeConfig(
      makeConfig({ rarityCounts: counts({ common: -3, rare: 2.6 }) }),
    );
    expect(result.rarityCounts.common).toBe(0);
    expect(result.rarityCounts.rare).toBe(3);
  });

  it("inverte faixas de quantidade digitadas ao contrário", () => {
    const result = sanitizeConfig(
      makeConfig({ qtyRange: { potion: [4, 2], scroll: [1, 5] } }),
    );
    expect(result.qtyRange.potion).toEqual([2, 4]);
  });

  it("não aceita quantidade menor que 1", () => {
    const result = sanitizeConfig(
      makeConfig({ qtyRange: { potion: [0, 0], scroll: [-2, 3] } }),
    );
    expect(result.qtyRange).toEqual({ potion: [1, 1], scroll: [1, 3] });
  });

  it("mantém pesos só dos tipos marcados", () => {
    const result = sanitizeConfig(
      makeConfig({ types: ["weapon"], typeWeights: { weapon: 60, ring: 40 } }),
    );
    expect(result.typeWeights).toEqual({ weapon: 60 });
  });

  it("não aceita variação aleatória negativa", () => {
    expect(sanitizeConfig(makeConfig({ randomVariance: -5 })).randomVariance).toBe(0);
  });

  it("aceita percentual geral negativo (desconto)", () => {
    expect(sanitizeConfig(makeConfig({ generalMod: -20 })).generalMod).toBe(-20);
  });

  it("troca valores não numéricos por zero", () => {
    expect(sanitizeConfig(makeConfig({ generalMod: Number.NaN })).generalMod).toBe(0);
  });
});
```

Run: `npx vitest run src/lib/config.test.ts`
Expected: FAIL por import; depois de criar o arquivo vazio, FAIL com `defaultGenConfig is not a function`.

**Step 2: Implementar**

`src/lib/config.ts`:

```ts
import { ITEM_TYPES, RARITIES, type GenConfig, type ItemType, type Rarity } from "./types";

export function defaultGenConfig(): GenConfig {
  return {
    rarityCounts: { common: 4, uncommon: 3, rare: 2, very_rare: 1, legendary: 0, artifact: 0 },
    types: [...ITEM_TYPES],
    allowRepeat: false,
    qtyRange: { potion: [1, 3], scroll: [1, 5] },
    randomVariance: 10,
    generalMod: 0,
    includeArtifacts: false,
  };
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function toInt(n: number, min: number): number {
  return Math.max(min, Math.round(finite(n)));
}

function toRange([a, b]: [number, number]): [number, number] {
  const lo = toInt(a, 1);
  const hi = toInt(b, 1);
  return lo <= hi ? [lo, hi] : [hi, lo];
}

export function sanitizeConfig(config: GenConfig): GenConfig {
  const rarityCounts = Object.fromEntries(
    RARITIES.map((r) => [r, toInt(config.rarityCounts[r], 0)]),
  ) as Record<Rarity, number>;
  const typeWeights = config.typeWeights
    ? (Object.fromEntries(
        config.types.map((t) => [t, toInt(config.typeWeights?.[t] ?? 0, 0)]),
      ) as Partial<Record<ItemType, number>>)
    : undefined;
  return {
    ...config,
    rarityCounts,
    typeWeights,
    qtyRange: { potion: toRange(config.qtyRange.potion), scroll: toRange(config.qtyRange.scroll) },
    randomVariance: toInt(config.randomVariance, 0),
    generalMod: Math.round(finite(config.generalMod)),
  };
}
```

Run: PASS (9 testes).

**Step 3: Commit**

```bash
git add src/lib/config.ts src/lib/config.test.ts
git commit -m "feat: add default generation config and sanitizer"
```

---

### Tarefa 10: Operações de loja, itens e NPCs (`shop.ts`)

**Files:**
- Create: `src/lib/__fixtures__/shop.ts`
- Create: `src/lib/__fixtures__/deps.ts`
- Create: `src/lib/shop.ts`
- Create: `src/lib/shop.test.ts`

**Step 1: Fixtures**

`src/lib/__fixtures__/shop.ts`:

```ts
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
```

`src/lib/__fixtures__/deps.ts`:

```ts
/** Relógio controlável e IDs previsíveis (`id-1`, `id-2`, ...). */
export function makeDeps(startIso = "2026-09-22T12:00:00.000Z") {
  let time = Date.parse(startIso);
  let n = 0;
  return {
    now: () => new Date(time),
    newId: () => `id-${++n}`,
    advance(ms: number) {
      time += ms;
    },
  };
}
```

**Step 2: Testes de criação, duplicação e lista de lojas (falham)**

`src/lib/shop.test.ts` (os imports cobrem o arquivo inteiro; os blocos seguintes entram nos próximos passos):

```ts
import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import {
  addManualItem,
  addNpc,
  changeSold,
  countByRarity,
  createShop,
  duplicateShop,
  filterShops,
  formatRarityChips,
  generalModOf,
  removeNpc,
  removeShopFromList,
  removeShopItem,
  setIndividualMod,
  setPriceOverride,
  setQty,
  updateNpc,
  upsertShopInList,
} from "./shop";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { counts, makeConfig } from "./__fixtures__/config";
import { makeDeps } from "./__fixtures__/deps";
import { makeShop, makeShopItem } from "./__fixtures__/shop";

describe("createShop", () => {
  it("cria loja vazia com id e datas injetados", () => {
    const shop = createShop(
      { name: "  A Lâmpada  ", location: "Neverwinter", kind: "Bazar" },
      makeDeps("2026-09-22T12:00:00.000Z"),
    );
    expect(shop).toEqual({
      id: "id-1",
      name: "A Lâmpada",
      location: "Neverwinter",
      kind: "Bazar",
      description: "",
      notes: "",
      npcs: [],
      items: [],
      createdAt: "2026-09-22T12:00:00.000Z",
      updatedAt: "2026-09-22T12:00:00.000Z",
    });
  });
});

describe("duplicateShop", () => {
  it("cria cópia com novo id, nome marcado e datas novas", () => {
    const original = makeShop({ items: [makeShopItem("bag-of-holding")] });
    const copy = duplicateShop(original, makeDeps("2026-09-22T12:00:00.000Z"));
    expect(copy.id).toBe("id-1");
    expect(copy.name).toBe("Empório do Anão (cópia)");
    expect(copy.createdAt).toBe("2026-09-22T12:00:00.000Z");
    expect(copy.items).toEqual(original.items);
  });

  it("não compartilha listas com a loja original", () => {
    const original = makeShop({ items: [makeShopItem("bag-of-holding")] });
    const copy = duplicateShop(original, makeDeps());
    copy.items[0].qty = 99;
    expect(original.items[0].qty).toBe(1);
  });
});

describe("lista de lojas", () => {
  it("upsertShopInList substitui a loja com o mesmo id", () => {
    const list = [makeShop({ id: "a" }), makeShop({ id: "b" })];
    const result = upsertShopInList(list, makeShop({ id: "a", name: "Nova" }));
    expect(result.map((s) => s.name)).toEqual(["Nova", "Empório do Anão"]);
  });

  it("upsertShopInList acrescenta loja nova no fim", () => {
    const result = upsertShopInList([makeShop({ id: "a" })], makeShop({ id: "b" }));
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("removeShopFromList tira a loja pelo id", () => {
    const result = removeShopFromList([makeShop({ id: "a" }), makeShop({ id: "b" })], "a");
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("filterShops busca por nome ou local, sem acento", () => {
    const list = [
      makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar" }),
      makeShop({ id: "b", name: "Bazar", location: "Águas Profundas" }),
    ];
    expect(filterShops(list, "runica").map((s) => s.id)).toEqual(["a"]);
    expect(filterShops(list, "aguas").map((s) => s.id)).toEqual(["b"]);
    expect(filterShops(list, "  ")).toHaveLength(2);
  });
});
```

Run: `npx vitest run src/lib/shop.test.ts`
Expected: FAIL com `Failed to resolve import "./shop"`.

Nota: os imports já listam todas as funções da tarefa. Até o Step 6, as que ainda não existem chegam como `undefined` e o `typecheck` reclama delas. Tudo bem durante a tarefa; no fim, teste e `typecheck` precisam passar. Os blocos `describe` dos Steps 4 a 6 entram no mesmo arquivo, cada um antes da sua implementação.

**Step 3: Implementar essas funções**

`src/lib/shop.ts`:

```ts
import { normalizeText } from "./catalog";
import { RARITY_SHORT } from "./labels";
import {
  RARITIES,
  type CatalogItem,
  type Clock,
  type IdSource,
  type Npc,
  type Rarity,
  type Shop,
  type ShopItem,
} from "./types";

export interface NewShopInput {
  name: string;
  location: string;
  kind: string;
}

export function createShop(input: NewShopInput, deps: Clock & IdSource): Shop {
  const now = deps.now().toISOString();
  return {
    id: deps.newId(),
    name: input.name.trim(),
    location: input.location.trim(),
    kind: input.kind.trim(),
    description: "",
    notes: "",
    npcs: [],
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateShop(shop: Shop, deps: Clock & IdSource): Shop {
  const now = deps.now().toISOString();
  const copy = JSON.parse(JSON.stringify(shop)) as Shop;
  return { ...copy, id: deps.newId(), name: `${shop.name} (cópia)`, createdAt: now, updatedAt: now };
}

export function upsertShopInList(shops: readonly Shop[], shop: Shop): Shop[] {
  const index = shops.findIndex((s) => s.id === shop.id);
  if (index < 0) return [...shops, shop];
  const next = [...shops];
  next[index] = shop;
  return next;
}

export function removeShopFromList(shops: readonly Shop[], id: string): Shop[] {
  return shops.filter((s) => s.id !== id);
}

export function filterShops(shops: readonly Shop[], query: string): Shop[] {
  const q = normalizeText(query.trim());
  if (q === "") return [...shops];
  return shops.filter(
    (s) => normalizeText(s.name).includes(q) || normalizeText(s.location).includes(q),
  );
}
```

Run: os testes deste bloco passam; os outros imports ainda não existem.

**Step 4: Contagem por raridade e percentual geral**

Testes (falham):

```ts
describe("countByRarity e formatRarityChips", () => {
  const index = indexCatalog(fixtureCatalog);

  it("conta linhas por raridade e ignora itens fora do catálogo", () => {
    const items = [
      makeShopItem("potion-of-healing", { qty: 5 }),
      makeShopItem("common-wondrous-1"),
      makeShopItem("armor-plus-1"),
      makeShopItem("item-que-sumiu"),
    ];
    expect(countByRarity(items, index)).toEqual(counts({ common: 2, rare: 1 }));
  });

  it("monta os chips na ordem das raridades e pula zeros", () => {
    expect(formatRarityChips(counts({ common: 6, uncommon: 4, rare: 2 }))).toBe("6 C · 4 U · 2 R");
    expect(formatRarityChips(counts({ very_rare: 1, artifact: 1 }))).toBe("1 VR · 1 A");
  });

  it("devolve texto vazio para loja sem itens", () => {
    expect(formatRarityChips(counts({}))).toBe("");
  });
});

describe("generalModOf", () => {
  it("usa o percentual geral da última configuração", () => {
    expect(generalModOf(makeShop({ lastConfig: makeConfig({ generalMod: 15 }) }))).toBe(15);
  });

  it("é zero quando a loja nunca foi gerada", () => {
    expect(generalModOf(makeShop())).toBe(0);
  });
});
```

Implementação:

```ts
export function countByRarity(
  items: readonly ShopItem[],
  index: ReadonlyMap<string, CatalogItem>,
): Record<Rarity, number> {
  const result = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
  for (const shopItem of items) {
    const item = index.get(shopItem.itemId);
    if (item) result[item.rarity]++;
  }
  return result;
}

export function formatRarityChips(countsByRarity: Record<Rarity, number>): string {
  return RARITIES.filter((r) => countsByRarity[r] > 0)
    .map((r) => `${countsByRarity[r]} ${RARITY_SHORT[r]}`)
    .join(" · ");
}

export function generalModOf(shop: Shop): number {
  return shop.lastConfig?.generalMod ?? 0;
}
```

Run: bloco verde.

**Step 5: Edição de itens**

Testes (falham):

```ts
describe("edição de itens da loja", () => {
  it("addManualItem acrescenta item novo com quantidade 1", () => {
    expect(addManualItem([], "bag-of-holding")).toEqual([makeShopItem("bag-of-holding")]);
  });

  it("addManualItem soma 1 quando o item já está na loja", () => {
    const result = addManualItem([makeShopItem("bag-of-holding", { qty: 2 })], "bag-of-holding");
    expect(result).toEqual([makeShopItem("bag-of-holding", { qty: 3 })]);
  });

  it("setQty não aceita menos que 1 e ajusta vendidos", () => {
    const items = [makeShopItem("a", { qty: 5, sold: 4 })];
    expect(setQty(items, "a", 2)[0]).toMatchObject({ qty: 2, sold: 2 });
    expect(setQty(items, "a", 0)[0].qty).toBe(1);
  });

  it("setIndividualMod grava o percentual individual", () => {
    const result = setIndividualMod([makeShopItem("a")], "a", -15);
    expect(result[0].priceMods).toEqual({ random: 0, individual: -15 });
  });

  it("setPriceOverride grava e remove o preço manual", () => {
    const withPrice = setPriceOverride([makeShopItem("a")], "a", 750);
    expect(withPrice[0].priceOverride).toBe(750);
    const cleared = setPriceOverride(withPrice, "a", undefined);
    expect("priceOverride" in cleared[0]).toBe(false);
  });

  it("changeSold fica entre 0 e a quantidade", () => {
    const items = [makeShopItem("a", { qty: 2, sold: 1 })];
    expect(changeSold(items, "a", 1)[0].sold).toBe(2);
    expect(changeSold(items, "a", 5)[0].sold).toBe(2);
    expect(changeSold(items, "a", -5)[0].sold).toBe(0);
  });

  it("removeShopItem tira o item", () => {
    expect(removeShopItem([makeShopItem("a"), makeShopItem("b")], "a")).toEqual([makeShopItem("b")]);
  });

  it("não altera a lista recebida", () => {
    const items = [makeShopItem("a")];
    setQty(items, "a", 3);
    expect(items[0].qty).toBe(1);
  });
});
```

Implementação:

```ts
function mapItem(
  items: readonly ShopItem[],
  itemId: string,
  fn: (item: ShopItem) => ShopItem,
): ShopItem[] {
  return items.map((item) => (item.itemId === itemId ? fn(item) : item));
}

export function addManualItem(items: readonly ShopItem[], itemId: string): ShopItem[] {
  if (items.some((item) => item.itemId === itemId)) {
    return mapItem(items, itemId, (item) => ({ ...item, qty: item.qty + 1 }));
  }
  return [...items, { itemId, qty: 1, priceMods: { random: 0, individual: 0 }, sold: 0 }];
}

export function setQty(items: readonly ShopItem[], itemId: string, qty: number): ShopItem[] {
  const next = Math.max(1, Math.round(qty));
  return mapItem(items, itemId, (item) => ({ ...item, qty: next, sold: Math.min(item.sold, next) }));
}

export function setIndividualMod(
  items: readonly ShopItem[],
  itemId: string,
  percent: number,
): ShopItem[] {
  return mapItem(items, itemId, (item) => ({
    ...item,
    priceMods: { ...item.priceMods, individual: Math.round(percent) },
  }));
}

export function setPriceOverride(
  items: readonly ShopItem[],
  itemId: string,
  value: number | undefined,
): ShopItem[] {
  return mapItem(items, itemId, (item) => {
    const next = { ...item };
    if (value === undefined) delete next.priceOverride;
    else next.priceOverride = Math.max(0, Math.round(value));
    return next;
  });
}

export function changeSold(items: readonly ShopItem[], itemId: string, delta: number): ShopItem[] {
  return mapItem(items, itemId, (item) => ({
    ...item,
    sold: Math.min(item.qty, Math.max(0, item.sold + delta)),
  }));
}

export function removeShopItem(items: readonly ShopItem[], itemId: string): ShopItem[] {
  return items.filter((item) => item.itemId !== itemId);
}
```

Run: bloco verde.

**Step 6: NPCs**

Testes (falham):

```ts
describe("NPCs", () => {
  it("addNpc acrescenta NPC em branco com id novo", () => {
    expect(addNpc([], makeDeps())).toEqual([{ id: "id-1", name: "", role: "", description: "" }]);
  });

  it("updateNpc altera só o NPC indicado", () => {
    const npcs = [
      { id: "a", name: "Brom", role: "Dono", description: "" },
      { id: "b", name: "Lia", role: "Aprendiz", description: "" },
    ];
    const result = updateNpc(npcs, "b", { role: "Sócia" });
    expect(result[1].role).toBe("Sócia");
    expect(result[0]).toBe(npcs[0]);
  });

  it("removeNpc tira o NPC pelo id", () => {
    const npcs = [{ id: "a", name: "Brom", role: "", description: "" }];
    expect(removeNpc(npcs, "a")).toEqual([]);
  });
});
```

Implementação:

```ts
export function addNpc(npcs: readonly Npc[], deps: IdSource): Npc[] {
  return [...npcs, { id: deps.newId(), name: "", role: "", description: "" }];
}

export function updateNpc(
  npcs: readonly Npc[],
  id: string,
  patch: Partial<Omit<Npc, "id">>,
): Npc[] {
  return npcs.map((npc) => (npc.id === id ? { ...npc, ...patch } : npc));
}

export function removeNpc(npcs: readonly Npc[], id: string): Npc[] {
  return npcs.filter((npc) => npc.id !== id);
}
```

Run: `npx vitest run src/lib/shop.test.ts && npm run typecheck`
Expected: PASS e typecheck limpo.

**Step 7: Commit**

```bash
git add src/lib/shop.ts src/lib/shop.test.ts src/lib/__fixtures__
git commit -m "feat: add shop, shop item and NPC operations"
```

---

### Tarefa 11: Agrupamento, filtro e ordenação da lista (`shopList.ts`)

**Files:**
- Create: `src/lib/shopList.ts`
- Create: `src/lib/shopList.test.ts`

**Step 1: Testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { indexCatalog } from "./catalog";
import { buildItemGroups } from "./shopList";
import { fixtureCatalog } from "./__fixtures__/catalog";
import { makeShopItem } from "./__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const items = [
  makeShopItem("ring-of-protection", { priceMods: { random: 0, individual: 10 } }),
  makeShopItem("potion-of-healing"),
  makeShopItem("armor-plus-1"),
  makeShopItem("common-wondrous-1"),
  makeShopItem("item-que-sumiu"),
];

describe("buildItemGroups", () => {
  it("agrupa na ordem das raridades e omite grupos vazios", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups.map((g) => g.rarity)).toEqual(["common", "rare"]);
  });

  it("ignora itens que não estão no catálogo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups.flatMap((g) => g.rows)).toHaveLength(4);
  });

  it("calcula preço final e preço base de cada linha", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    const ring = groups[1].rows.find((r) => r.item.id === "ring-of-protection");
    expect(ring).toMatchObject({ price: 4400, base: 4000 });
  });

  it("filtra por tipo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name", type: "wondrous" });
    expect(groups.map((g) => g.rows.map((r) => r.item.id))).toEqual([["common-wondrous-1"]]);
  });

  it("filtra por raridade", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name", rarity: "rare" });
    expect(groups.map((g) => g.rarity)).toEqual(["rare"]);
  });

  it("ordena por nome em português dentro do grupo", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "name" });
    expect(groups[0].rows.map((r) => r.item.namePt)).toEqual(["common-wondrous-1", "Poção de Cura"]);
  });

  it("ordena por preço do maior para o menor", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "price_desc" });
    expect(groups[1].rows.map((r) => r.item.id)).toEqual(["ring-of-protection", "armor-plus-1"]);
  });

  it("ordena por preço do menor para o maior", () => {
    const groups = buildItemGroups(items, index, 0, { sort: "price_asc" });
    expect(groups[0].rows.map((r) => r.item.id)).toEqual(["potion-of-healing", "common-wondrous-1"]);
  });
});
```

Conta de conferência: anel `4000 × 1,10 = 4400`; poção comum `50`; maravilhoso comum `100`.

Run: FAIL por import.

**Step 2: Implementar**

`src/lib/shopList.ts`:

```ts
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
```

Run: `npx vitest run src/lib/shopList.test.ts`
Expected: PASS (8 testes).

**Step 3: Commit**

```bash
git add src/lib/shopList.ts src/lib/shopList.test.ts
git commit -m "feat: add grouped, filtered and sorted item list"
```

---

### Tarefa 12: Persistência, snapshots e backup (`storage.ts`)

`storage.ts` recebe um `Storage` (a mesma interface do DOM). Nos testes, use o fake em memória desta tarefa. Não use `localStorage` real nem `vi.mock`.

Formato gravado em `lojinha:v1`: o mesmo do backup exportado, `{ schemaVersion, exportedAt, shops }`. Assim uma única validação serve para carregar e para importar.

**Files:**
- Create: `src/lib/guards.ts`
- Create: `src/lib/__fixtures__/memoryStorage.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

**Step 1: Guardas de tipo (usadas por `storage.ts` e, na Tarefa 13, pela validação do catálogo)**

`src/lib/guards.ts`:

```ts
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
```

Essas funções são cobertas pelos testes de `storage.ts` e `catalogValidation.ts`.

**Step 2: Storage falso em memória**

`src/lib/__fixtures__/memoryStorage.ts`:

```ts
interface MemoryStorageOptions {
  /** Limite de caracteres (chaves + valores). Acima dele, setItem lança QuotaExceededError. */
  quotaChars?: number;
  /** Simula navegador que bloqueia o storage. */
  unavailable?: boolean;
}

export function memoryStorage(options: MemoryStorageOptions = {}): Storage {
  const data = new Map<string, string>();
  const guard = () => {
    if (options.unavailable) throw new DOMException("bloqueado", "SecurityError");
  };
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => {
      guard();
      return data.get(key) ?? null;
    },
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      guard();
      const used = [...data.entries()]
        .filter(([k]) => k !== key)
        .reduce((sum, [k, v]) => sum + k.length + v.length, 0);
      if (options.quotaChars !== undefined && used + key.length + value.length > options.quotaChars) {
        throw new DOMException("cheio", "QuotaExceededError");
      }
      data.set(key, String(value));
    },
  };
}
```

**Step 3: Testes de carregar e salvar (falham)**

`src/lib/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SHOPS_KEY,
  SNAPSHOT_INTERVAL_MS,
  applyImport,
  backupFileName,
  createSnapshot,
  exportBackup,
  importBackup,
  listSnapshots,
  loadShops,
  maybeAutoSnapshot,
  parseBackup,
  restoreSnapshot,
  saveShops,
} from "./storage";
import { makeDeps } from "./__fixtures__/deps";
import { memoryStorage } from "./__fixtures__/memoryStorage";
import { makeShop, makeShopItem } from "./__fixtures__/shop";

const shopA = makeShop({ id: "a", name: "Loja A", items: [makeShopItem("bag-of-holding")] });
const shopB = makeShop({ id: "b", name: "Loja B" });

describe("loadShops e saveShops", () => {
  it("devolve lista vazia quando não há nada salvo", () => {
    expect(loadShops(memoryStorage())).toEqual({ ok: true, value: [] });
  });

  it("lê as lojas gravadas por saveShops", () => {
    const storage = memoryStorage();
    expect(saveShops(storage, [shopA, shopB], makeDeps()).ok).toBe(true);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA, shopB] });
  });

  it("acusa dados corrompidos sem apagá-los", () => {
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    expect(loadShops(storage)).toEqual({ ok: false, error: "corrupt" });
    expect(storage.getItem(SHOPS_KEY)).toBe("{lixo");
  });

  it("acusa storage indisponível ao carregar", () => {
    expect(loadShops(memoryStorage({ unavailable: true }))).toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("acusa armazenamento cheio ao salvar", () => {
    const result = saveShops(memoryStorage({ quotaChars: 10 }), [shopA], makeDeps());
    expect(result).toEqual({ ok: false, error: "quota" });
  });
});
```

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL com `Failed to resolve import "./storage"`.

**Step 4: Implementar validação, carga e gravação**

`src/lib/storage.ts`:

```ts
import { isFiniteNumber, isRecord, isString } from "./guards";
import type { Clock, IdSource, Shop } from "./types";

export const SHOPS_KEY = "lojinha:v1";
export const SNAPSHOTS_KEY = "lojinha:snapshots";
export const SCHEMA_VERSION = 1;
export const MAX_SNAPSHOTS = 10;
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

export type StorageError = "unavailable" | "quota" | "corrupt";
export type ParseError = "invalid_json" | "unknown_schema" | "invalid_shape";
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
export type ImportMode = "replace" | "merge";

export interface Backup {
  schemaVersion: number;
  exportedAt: string;
  shops: Shop[];
}

export interface Snapshot {
  id: string;
  createdAt: string;
  shops: Shop[];
}

function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// ---------- validação ----------

const SHOP_STRING_FIELDS = [
  "id",
  "name",
  "location",
  "kind",
  "description",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

function isShopItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.itemId) &&
    isFiniteNumber(value.qty) &&
    isFiniteNumber(value.sold) &&
    isRecord(value.priceMods) &&
    isFiniteNumber(value.priceMods.random) &&
    isFiniteNumber(value.priceMods.individual) &&
    (value.priceOverride === undefined || isFiniteNumber(value.priceOverride))
  );
}

function isNpc(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.role) &&
    isString(value.description)
  );
}

export function isShop(value: unknown): value is Shop {
  return (
    isRecord(value) &&
    SHOP_STRING_FIELDS.every((field) => isString(value[field])) &&
    Array.isArray(value.npcs) &&
    value.npcs.every(isNpc) &&
    Array.isArray(value.items) &&
    value.items.every(isShopItem) &&
    (value.lastConfig === undefined || isRecord(value.lastConfig))
  );
}

export function parseBackup(json: string): Result<Backup, ParseError> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return fail("invalid_json");
  }
  if (!isRecord(raw)) return fail("invalid_shape");
  if (raw.schemaVersion !== SCHEMA_VERSION) return fail("unknown_schema");
  if (!Array.isArray(raw.shops) || !raw.shops.every(isShop)) return fail("invalid_shape");
  return ok({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : "",
    shops: raw.shops,
  });
}

// ---------- leitura e escrita ----------

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function write(storage: Storage, key: string, value: string): Result<void, StorageError> {
  try {
    storage.setItem(key, value);
    return ok(undefined);
  } catch (error) {
    return fail(isQuotaError(error) ? "quota" : "unavailable");
  }
}

function toBackup(shops: readonly Shop[], clock: Clock): Backup {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: clock.now().toISOString(), shops: [...shops] };
}

export function loadShops(storage: Storage): Result<Shop[], StorageError> {
  let json: string | null;
  try {
    json = storage.getItem(SHOPS_KEY);
  } catch {
    return fail("unavailable");
  }
  if (json === null) return ok([]);
  const parsed = parseBackup(json);
  return parsed.ok ? ok(parsed.value.shops) : fail("corrupt");
}

export function saveShops(
  storage: Storage,
  shops: readonly Shop[],
  clock: Clock,
): Result<void, StorageError> {
  return write(storage, SHOPS_KEY, JSON.stringify(toBackup(shops, clock)));
}
```

Run: PASS (5 testes).

**Step 5: Testes de snapshots (falham)**

```ts
describe("snapshots", () => {
  it("createSnapshot guarda o mais recente primeiro", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    createSnapshot(storage, [shopA], deps);
    createSnapshot(storage, [shopA, shopB], deps);
    const snapshots = listSnapshots(storage);
    expect(snapshots.map((s) => s.id)).toEqual(["id-2", "id-1"]);
    expect(snapshots[0].shops).toEqual([shopA, shopB]);
  });

  it("mantém no máximo 10 e descarta o mais antigo", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    for (let i = 0; i < 11; i++) createSnapshot(storage, [shopA], deps);
    const ids = listSnapshots(storage).map((s) => s.id);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe("id-11");
    expect(ids).not.toContain("id-1");
  });

  it("maybeAutoSnapshot cria o primeiro snapshot", () => {
    const storage = memoryStorage();
    expect(maybeAutoSnapshot(storage, [shopA], makeDeps())).toBe(true);
    expect(listSnapshots(storage)).toHaveLength(1);
  });

  it("maybeAutoSnapshot espera 5 minutos entre snapshots", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    maybeAutoSnapshot(storage, [shopA], deps);
    deps.advance(SNAPSHOT_INTERVAL_MS - 1000);
    expect(maybeAutoSnapshot(storage, [shopA], deps)).toBe(false);
    deps.advance(1000);
    expect(maybeAutoSnapshot(storage, [shopA], deps)).toBe(true);
    expect(listSnapshots(storage)).toHaveLength(2);
  });

  it("ignora lista de snapshots corrompida", () => {
    const storage = memoryStorage();
    storage.setItem("lojinha:snapshots", "{lixo");
    expect(listSnapshots(storage)).toEqual([]);
  });
});
```

Run: FAIL (`createSnapshot is not a function`).

**Step 6: Implementar snapshots**

```ts
// ---------- snapshots ----------

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.createdAt) &&
    Array.isArray(value.shops) &&
    value.shops.every(isShop)
  );
}

export function listSnapshots(storage: Storage): Snapshot[] {
  try {
    const raw = storage.getItem(SNAPSHOTS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSnapshot) : [];
  } catch {
    return [];
  }
}

export function createSnapshot(
  storage: Storage,
  shops: readonly Shop[],
  deps: Clock & IdSource,
): Result<void, StorageError> {
  const snapshot: Snapshot = {
    id: deps.newId(),
    createdAt: deps.now().toISOString(),
    shops: [...shops],
  };
  const next = [snapshot, ...listSnapshots(storage)].slice(0, MAX_SNAPSHOTS);
  return write(storage, SNAPSHOTS_KEY, JSON.stringify(next));
}

/** Cria snapshot se o último tiver 5 minutos ou mais. Devolve true se criou. */
export function maybeAutoSnapshot(
  storage: Storage,
  shops: readonly Shop[],
  deps: Clock & IdSource,
): boolean {
  const [latest] = listSnapshots(storage);
  if (latest && deps.now().getTime() - Date.parse(latest.createdAt) < SNAPSHOT_INTERVAL_MS) {
    return false;
  }
  return createSnapshot(storage, shops, deps).ok;
}
```

Run: PASS (10 testes).

**Step 7: Testes de exportação e validação de backup (falham)**

```ts
describe("exportBackup e parseBackup", () => {
  it("exporta e reimporta as mesmas lojas", () => {
    const json = exportBackup([shopA, shopB], makeDeps("2026-09-22T12:00:00.000Z"));
    expect(parseBackup(json)).toEqual({
      ok: true,
      value: { schemaVersion: 1, exportedAt: "2026-09-22T12:00:00.000Z", shops: [shopA, shopB] },
    });
  });

  it("rejeita texto que não é JSON", () => {
    expect(parseBackup("{lixo")).toEqual({ ok: false, error: "invalid_json" });
  });

  it("rejeita schemaVersion desconhecido", () => {
    expect(parseBackup(JSON.stringify({ schemaVersion: 2, shops: [] }))).toEqual({
      ok: false,
      error: "unknown_schema",
    });
  });

  it("rejeita backup sem schemaVersion", () => {
    expect(parseBackup(JSON.stringify({ shops: [] }))).toEqual({
      ok: false,
      error: "unknown_schema",
    });
  });

  it("rejeita loja com formato inválido", () => {
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, shops: [{ id: 1 }] }))).toEqual({
      ok: false,
      error: "invalid_shape",
    });
  });

  it("nomeia o arquivo com a data", () => {
    expect(backupFileName(makeDeps("2026-09-22T12:00:00.000Z"))).toBe(
      "lojinha-backup-2026-09-22.json",
    );
  });
});
```

Run: FAIL. Implemente:

```ts
// ---------- backup ----------

export function exportBackup(shops: readonly Shop[], clock: Clock): string {
  return JSON.stringify(toBackup(shops, clock), null, 2);
}

export function backupFileName(clock: Clock): string {
  return `lojinha-backup-${clock.now().toISOString().slice(0, 10)}.json`;
}
```

Run: PASS (16 testes).

**Step 8: Testes de importação e restauração (falham)**

```ts
describe("applyImport", () => {
  it("substitui tudo no modo replace", () => {
    expect(applyImport([shopA], [shopB], "replace")).toEqual([shopB]);
  });

  it("no modo merge troca lojas de mesmo id e acrescenta as novas", () => {
    const newA = { ...shopA, name: "Loja A importada" };
    const shopC = makeShop({ id: "c" });
    expect(applyImport([shopA, shopB], [newA, shopC], "merge")).toEqual([newA, shopB, shopC]);
  });
});

describe("importBackup", () => {
  function setup() {
    const storage = memoryStorage();
    const deps = makeDeps();
    saveShops(storage, [shopA], deps);
    return { storage, deps };
  }

  it("JSON inválido não altera os dados nem cria snapshot", () => {
    const { storage, deps } = setup();
    expect(importBackup(storage, [shopA], "{lixo", "replace", deps)).toEqual({
      ok: false,
      error: "invalid_json",
    });
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA] });
    expect(listSnapshots(storage)).toEqual([]);
  });

  it("schemaVersion desconhecido não altera os dados", () => {
    const { storage, deps } = setup();
    const json = JSON.stringify({ schemaVersion: 99, shops: [] });
    expect(importBackup(storage, [shopA], json, "replace", deps).ok).toBe(false);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopA] });
  });

  it("cria snapshot dos dados atuais antes de importar", () => {
    const { storage, deps } = setup();
    const json = exportBackup([shopB], deps);
    expect(importBackup(storage, [shopA], json, "replace", deps)).toEqual({
      ok: true,
      value: [shopB],
    });
    expect(listSnapshots(storage)[0].shops).toEqual([shopA]);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopB] });
  });
});

describe("restoreSnapshot", () => {
  it("cria snapshot do estado atual e restaura o escolhido", () => {
    const storage = memoryStorage();
    const deps = makeDeps();
    createSnapshot(storage, [shopB], deps); // id-1
    const result = restoreSnapshot(storage, [shopA], "id-1", deps);
    expect(result).toEqual({ ok: true, value: [shopB] });
    expect(listSnapshots(storage)[0].shops).toEqual([shopA]);
    expect(loadShops(storage)).toEqual({ ok: true, value: [shopB] });
  });

  it("avisa quando o snapshot não existe", () => {
    const storage = memoryStorage();
    expect(restoreSnapshot(storage, [shopA], "nao-existe", makeDeps())).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});
```

Run: FAIL. Implemente:

```ts
export function applyImport(
  current: readonly Shop[],
  imported: readonly Shop[],
  mode: ImportMode,
): Shop[] {
  if (mode === "replace") return [...imported];
  const importedById = new Map(imported.map((shop) => [shop.id, shop]));
  const currentIds = new Set(current.map((shop) => shop.id));
  return [
    ...current.map((shop) => importedById.get(shop.id) ?? shop),
    ...imported.filter((shop) => !currentIds.has(shop.id)),
  ];
}

export function importBackup(
  storage: Storage,
  current: readonly Shop[],
  json: string,
  mode: ImportMode,
  deps: Clock & IdSource,
): Result<Shop[], ParseError | StorageError> {
  const parsed = parseBackup(json);
  if (!parsed.ok) return fail(parsed.error);
  const snapshot = createSnapshot(storage, current, deps);
  if (!snapshot.ok) return fail(snapshot.error);
  const next = applyImport(current, parsed.value.shops, mode);
  const saved = saveShops(storage, next, deps);
  return saved.ok ? ok(next) : fail(saved.error);
}

export function restoreSnapshot(
  storage: Storage,
  current: readonly Shop[],
  snapshotId: string,
  deps: Clock & IdSource,
): Result<Shop[], StorageError | "not_found"> {
  const target = listSnapshots(storage).find((s) => s.id === snapshotId);
  if (!target) return fail("not_found");
  const snapshot = createSnapshot(storage, current, deps);
  if (!snapshot.ok) return fail(snapshot.error);
  const saved = saveShops(storage, target.shops, deps);
  return saved.ok ? ok(target.shops) : fail(saved.error);
}
```

O alvo é lido **antes** de criar o snapshot novo. Se fosse depois, com 10 snapshots o alvo mais antigo seria descartado.

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS (23 testes).

**Step 9: Verificação da fase 1**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Expected: tudo verde. Anote a contagem de testes na mensagem ao usuário.

**Step 10: Commit**

```bash
git add src/lib/guards.ts src/lib/storage.ts src/lib/storage.test.ts src/lib/__fixtures__/memoryStorage.ts
git commit -m "feat: add localStorage persistence, snapshots, export and import"
```

---

# Fase 2 — Catálogo

### Tarefa 13: Validação do catálogo (`catalogValidation.ts` e `catalog:validate`)

**Files:**
- Create: `src/lib/catalogValidation.ts`
- Create: `src/lib/catalogValidation.test.ts`
- Create: `scripts/validate-catalog.ts`

**Step 1: Testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { validateCatalog } from "./catalogValidation";
import { fixtureCatalog } from "./__fixtures__/catalog";

const valid = fixtureCatalog[0];

describe("validateCatalog", () => {
  it("aceita um catálogo correto", () => {
    expect(validateCatalog(fixtureCatalog)).toEqual([]);
  });

  it("acusa tipo inválido", () => {
    expect(validateCatalog([{ ...valid, type: "shield" }])).toEqual([
      'potion-of-healing: tipo inválido "shield"',
    ]);
  });

  it("acusa raridade inválida", () => {
    expect(validateCatalog([{ ...valid, rarity: "epic" }])).toEqual([
      'potion-of-healing: raridade inválida "epic"',
    ]);
  });

  it("acusa nome em português vazio", () => {
    expect(validateCatalog([{ ...valid, namePt: " " }])).toEqual([
      "potion-of-healing: nome em português vazio",
    ]);
  });

  it("acusa id repetido", () => {
    expect(validateCatalog([valid, valid])).toEqual(["potion-of-healing: id repetido"]);
  });

  it("acusa consumable diferente do tipo", () => {
    expect(validateCatalog([{ ...valid, consumable: false }])).toEqual([
      "potion-of-healing: consumable deve ser true",
    ]);
  });

  it("acusa URL fora do AideDD", () => {
    expect(validateCatalog([{ ...valid, url: "https://example.com/x" }])).toEqual([
      "potion-of-healing: URL fora do AideDD",
    ]);
  });

  it("acusa entrada que não é objeto", () => {
    expect(validateCatalog([42])).toEqual(["#0: não é um objeto"]);
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/lib/catalogValidation.ts`:

```ts
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
```

Run: PASS (8 testes).

**Step 3: Script de linha de comando**

`scripts/validate-catalog.ts`:

```ts
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
```

Ainda não há `items.json`; o script será usado na Tarefa 17.

**Step 4: Commit**

```bash
git add src/lib/catalogValidation.ts src/lib/catalogValidation.test.ts scripts/validate-catalog.ts
git commit -m "feat: add catalog validation and catalog:validate script"
```

---

### Tarefa 14: Parser da lista do AideDD (`scripts/aidedd/parse.ts`)

Releia "Fatos sobre o AideDD" no topo deste plano. O parser só extrai nome, tipo, raridade, sintonização e link. Não copie descrições.

**Files:**
- Create: `scripts/aidedd/parse.ts`
- Create: `scripts/aidedd/parse.test.ts`

**Step 1: Testes do parser de HTML (falham)**

`scripts/aidedd/parse.test.ts`:

```ts
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
```

Run: `npx vitest run scripts/aidedd/parse.test.ts`
Expected: FAIL por import.

**Step 2: Implementar o parser**

`scripts/aidedd/parse.ts`:

```ts
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
```

Run: PASS (7 testes).

**Step 3: Testes de expansão em variantes e nomes em PT (falham)**

Acrescente:

```ts
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
```

Run: FAIL (`expandRow is not a function`).

**Step 4: Implementar**

Acrescente a `scripts/aidedd/parse.ts`:

```ts
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
```

Nomes como `Rod of the Pact Keeper` não têm o sufixo `, +1, +2, or +3`; o `replace` não muda nada e a variante vira `Rod of the Pact Keeper +1`.

Run: `npx vitest run scripts/aidedd/parse.test.ts`
Expected: PASS (15 testes).

**Step 5: Commit**

```bash
git add scripts/aidedd/parse.ts scripts/aidedd/parse.test.ts
git commit -m "feat: add AideDD list parser and variant expansion"
```

---

### Tarefa 15: Tabela manual de variantes (`scripts/aidedd/variants.ts`)

Doze itens têm raridade "Rarity Varies" ou texto especial. As raridades abaixo foram conferidas nas páginas do AideDD em 2026-09-22, exceto os três itens "Enspelled", cuja página não traz a tabela (não é OGL). **Confira os Enspelled no DMG 2024 impresso antes de fechar a tarefa.** Se divergir, corrija e anote no commit.

**Files:**
- Create: `scripts/aidedd/variants.ts`
- Create: `scripts/aidedd/variants.test.ts`

**Step 1: Teste que falha**

```ts
import { describe, expect, it } from "vitest";
import { RARITIES } from "../../src/lib/types";
import { MANUAL_VARIANTS } from "./variants";

const SLUGS = [
  "belt-of-giant-strength",
  "enspelled-armor",
  "enspelled-staff",
  "enspelled-weapon",
  "figurine-of-wondrous-power",
  "horn-of-valhalla",
  "instrument-of-the-bards",
  "ioun-stone",
  "potion-of-giant-strength",
  "potions-of-healing",
  "quaal-s-feather-token",
  "spell-scroll",
];

describe("MANUAL_VARIANTS", () => {
  it("cobre os doze itens de raridade variável sem padrão +N", () => {
    expect(Object.keys(MANUAL_VARIANTS).sort()).toEqual(SLUGS);
  });

  it("não repete chave dentro do mesmo item", () => {
    for (const variants of Object.values(MANUAL_VARIANTS)) {
      const keys = variants.map((v) => v.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("usa só raridades válidas e nomes preenchidos", () => {
    for (const variants of Object.values(MANUAL_VARIANTS)) {
      for (const v of variants) {
        expect(RARITIES).toContain(v.rarity);
        expect(v.nameEn.trim()).not.toBe("");
      }
    }
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`scripts/aidedd/variants.ts`:

```ts
import type { Rarity } from "../../src/lib/types";
import type { ManualVariant } from "./parse";

function variants(
  baseName: string,
  entries: readonly [key: string, label: string, rarity: Rarity][],
): ManualVariant[] {
  return entries.map(([key, label, rarity]) => ({ key, nameEn: `${baseName} (${label})`, rarity }));
}

const giants = (base: string, rarities: [Rarity, Rarity, Rarity, Rarity, Rarity, Rarity]) =>
  variants(base, [
    ["hill", "Hill", rarities[0]],
    ["frost", "Frost", rarities[1]],
    ["stone", "Stone", rarities[2]],
    ["fire", "Fire", rarities[3]],
    ["cloud", "Cloud", rarities[4]],
    ["storm", "Storm", rarities[5]],
  ]);

/** Confirmar no DMG 2024 impresso: o AideDD não publica esta tabela. */
const enspelled = (base: string) =>
  variants(base, [
    ["level-0-1", "Cantrip or Level 1", "uncommon"],
    ["level-2-3", "Level 2–3", "rare"],
    ["level-4-5", "Level 4–5", "very_rare"],
    ["level-6-8", "Level 6–8", "legendary"],
  ]);

export const MANUAL_VARIANTS: Record<string, ManualVariant[]> = {
  "belt-of-giant-strength": giants("Belt of Giant Strength", [
    "rare",
    "very_rare",
    "very_rare",
    "very_rare",
    "legendary",
    "legendary",
  ]),
  "potion-of-giant-strength": giants("Potion of Giant Strength", [
    "uncommon",
    "rare",
    "rare",
    "rare",
    "very_rare",
    "legendary",
  ]),
  "enspelled-armor": enspelled("Enspelled Armor"),
  "enspelled-staff": enspelled("Enspelled Staff"),
  "enspelled-weapon": enspelled("Enspelled Weapon"),
  "figurine-of-wondrous-power": variants("Figurine of Wondrous Power", [
    ["bronze-griffon", "Bronze Griffon", "rare"],
    ["ebony-fly", "Ebony Fly", "rare"],
    ["golden-lions", "Golden Lions", "rare"],
    ["ivory-goats", "Ivory Goats", "rare"],
    ["marble-elephant", "Marble Elephant", "rare"],
    ["obsidian-steed", "Obsidian Steed", "very_rare"],
    ["onyx-dog", "Onyx Dog", "rare"],
    ["serpentine-owl", "Serpentine Owl", "rare"],
    ["silver-raven", "Silver Raven", "uncommon"],
  ]),
  "horn-of-valhalla": variants("Horn of Valhalla", [
    ["silver", "Silver", "rare"],
    ["brass", "Brass", "rare"],
    ["bronze", "Bronze", "very_rare"],
    ["iron", "Iron", "legendary"],
  ]),
  "instrument-of-the-bards": variants("Instrument of the Bards", [
    ["anstruth-harp", "Anstruth Harp", "very_rare"],
    ["canaith-mandolin", "Canaith Mandolin", "rare"],
    ["cli-lyre", "Cli Lyre", "rare"],
    ["doss-lute", "Doss Lute", "uncommon"],
    ["fochlucan-bandore", "Fochlucan Bandore", "uncommon"],
    ["mac-fuirmidh-cittern", "Mac-Fuirmidh Cittern", "uncommon"],
    ["ollamh-harp", "Ollamh Harp", "legendary"],
  ]),
  "ioun-stone": variants("Ioun Stone", [
    ["absorption", "Absorption", "very_rare"],
    ["agility", "Agility", "very_rare"],
    ["awareness", "Awareness", "rare"],
    ["fortitude", "Fortitude", "very_rare"],
    ["greater-absorption", "Greater Absorption", "legendary"],
    ["insight", "Insight", "very_rare"],
    ["intellect", "Intellect", "very_rare"],
    ["leadership", "Leadership", "very_rare"],
    ["mastery", "Mastery", "legendary"],
    ["protection", "Protection", "rare"],
    ["regeneration", "Regeneration", "legendary"],
    ["reserve", "Reserve", "rare"],
    ["strength", "Strength", "very_rare"],
    ["sustenance", "Sustenance", "rare"],
  ]),
  "potions-of-healing": [
    { key: "healing", nameEn: "Potion of Healing", rarity: "common" },
    { key: "greater", nameEn: "Potion of Healing (Greater)", rarity: "uncommon" },
    { key: "superior", nameEn: "Potion of Healing (Superior)", rarity: "rare" },
    { key: "supreme", nameEn: "Potion of Healing (Supreme)", rarity: "very_rare" },
  ],
  "quaal-s-feather-token": variants("Quaal's Feather Token", [
    ["anchor", "Anchor", "uncommon"],
    ["bird", "Bird", "rare"],
    ["fan", "Fan", "uncommon"],
    ["swan-boat", "Swan Boat", "rare"],
    ["tree", "Tree", "uncommon"],
    ["whip", "Whip", "rare"],
  ]),
  "spell-scroll": variants("Spell Scroll", [
    ["cantrip", "Cantrip", "common"],
    ["level-1", "Level 1", "common"],
    ["level-2", "Level 2", "uncommon"],
    ["level-3", "Level 3", "uncommon"],
    ["level-4", "Level 4", "rare"],
    ["level-5", "Level 5", "rare"],
    ["level-6", "Level 6", "very_rare"],
    ["level-7", "Level 7", "very_rare"],
    ["level-8", "Level 8", "very_rare"],
    ["level-9", "Level 9", "legendary"],
  ]),
};
```

Run: `npx vitest run scripts/aidedd/variants.test.ts`
Expected: PASS (3 testes).

**Step 3: Commit**

```bash
git add scripts/aidedd/variants.ts scripts/aidedd/variants.test.ts
git commit -m "feat: add manual rarity variants for AideDD items"
```

---

### Tarefa 16: Script de extração e primeira geração do catálogo

O script faz rede e escreve arquivos. Não tem teste automatizado; a lógica testável já está em `parse.ts`. A verificação é a saída do script e o `catalog:validate`.

**Files:**
- Create: `scripts/scrape-aidedd.ts`
- Create: `scripts/aidedd/names-pt.json` (gerado pelo script)
- Create: `src/data/items.json` (gerado pelo script)

**Step 1: Escrever o script**

`scripts/scrape-aidedd.ts`:

```ts
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
```

**Step 2: Rodar**

```bash
npm run catalog:scrape
```

Expected (números de 2026-09-22):

```
350 linhas do AideDD → 430 itens em src/data/items.json.
430 itens sem nome em português (preencha scripts/aidedd/names-pt.json).
```

Se aparecer `Raridade não reconhecida para <slug>`, o AideDD acrescentou um item de raridade variável. Acrescente-o em `variants.ts` (com teste atualizado em `variants.test.ts`) e rode de novo.

**Step 3: Conferir que a validação acusa só os nomes em PT**

```bash
npm run catalog:validate
```

Expected: FAIL, com 430 linhas `...: nome em português vazio` e nenhum outro tipo de erro. Se houver outro erro, corrija antes de seguir.

**Step 4: Commit**

```bash
git add scripts/scrape-aidedd.ts scripts/aidedd/names-pt.json src/data/items.json
git commit -m "feat: scrape DMG 2024 magic item list from AideDD"
```

---

### Tarefa 17: Nomes em português

**Files:**
- Modify: `scripts/aidedd/names-pt.json`
- Modify: `src/data/items.json` (regerado)

**Step 1: Preencher `names-pt.json`**

Cada chave é o `id` do item; o valor é o nome em português.

Regras:
- Use a tradução oficial brasileira quando conhecida (livros da Galápagos). Exemplos: `bag-of-holding` → "Bolsa Guarda-Tudo", `immovable-rod` → "Bastão Imóvel", `ring-of-protection` → "Anel de Proteção", `potions-of-healing--healing` → "Poção de Cura".
- Sem tradução oficial conhecida, traduza de forma fiel e curta.
- Variantes seguem o nome base: `armor-1-2-or-3--plus-2` → "Armadura +2"; `spell-scroll--level-3` → "Pergaminho de Magia (Nível 3)"; `belt-of-giant-strength--hill` → "Cinto de Força do Gigante (da Colina)".
- Não copie descrições. Só o nome.
- Nomes em inglês ficam como estão; a interface mostra os dois.

**Step 2: Regerar e validar**

```bash
npm run catalog:scrape
npm run catalog:validate
```

Expected: `0 itens sem nome em português` e `Catálogo válido: 430 itens.`

**Step 3: Commit**

```bash
git add scripts/aidedd/names-pt.json src/data/items.json
git commit -m "feat: add Portuguese names to the item catalog"
```

---

### Tarefa 18: Catálogo no app (`catalogData.ts`)

**Files:**
- Create: `src/lib/catalogData.ts`
- Create: `src/lib/catalogData.test.ts`

Este é o único teste que usa o `items.json` completo. Ele confere o dado real, não a lógica.

**Step 1: Testes que falham**

```ts
import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalogData";
import { validateCatalog } from "./catalogValidation";
import { defaultGenConfig } from "./config";
import { generateItems } from "./generator";
import { mulberry32 } from "./random";
import { ITEM_TYPES, RARITIES } from "./types";

describe("catálogo real", () => {
  it("passa na validação", () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
  });

  it("tem itens de todas as raridades e de todos os tipos", () => {
    for (const r of RARITIES) expect(CATALOG.some((i) => i.rarity === r)).toBe(true);
    for (const t of ITEM_TYPES) expect(CATALOG.some((i) => i.type === t)).toBe(true);
  });

  it("gera a loja padrão sem faltar itens", () => {
    const result = generateItems({ catalog: CATALOG, config: defaultGenConfig(), rng: mulberry32(1) });
    expect(result.shortfalls).toEqual([]);
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/lib/catalogData.ts`:

```ts
import items from "@/data/items.json";
import { indexCatalog } from "./catalog";
import type { CatalogItem } from "./types";

export const CATALOG: readonly CatalogItem[] = items as CatalogItem[];
export const CATALOG_INDEX = indexCatalog(CATALOG);
```

Run: `npx vitest run src/lib/catalogData.test.ts`
Expected: PASS (3 testes).

**Step 3: Verificação da fase 2 e commit**

```bash
npm run test:run && npm run typecheck && npm run lint && npm run catalog:validate
git add src/lib/catalogData.ts src/lib/catalogData.test.ts
git commit -m "feat: load item catalog into the app"
```

---

# Fase 3 — Interface

Regras desta fase:
- Componentes ficam em `src/components/`, com teste ao lado (`Nome.test.tsx`).
- Teste o que o usuário vê e faz: `screen.getByRole`, `getByLabelText`, `userEvent`. Não teste estado interno nem classes CSS.
- Componentes não chamam `Math.random`, `Date` nem `localStorage`. Recebem catálogo, RNG e relógio por props ou pelo `ShopsProvider`.
- Componentes não importam `next/navigation`. Só as páginas em `src/app/` usam o router e passam callbacks.
- Nos testes de componente, use o `fixtureCatalog`. O catálogo real só entra nas páginas.
- Cada teste de componente começa com `const user = userEvent.setup();` quando usar `user`.

### Tarefa 19: Tema, fontes e layout base

CSS e fontes não têm teste automatizado. A verificação é visual (Step 4).

**Files:**
- Modify: `src/app/globals.css` (substituir tudo)
- Modify: `src/app/layout.tsx` (substituir tudo)
- Modify: `src/app/page.tsx` (substituir tudo, provisório)

**Step 1: `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --parchment: #f3e7c9;
  --parchment-deep: #e6d3a3;
  --ink: #3b2a1a;
  --ink-soft: #5e4630;
  --blood: #8b1a1a;
  --gold: #a8833a;
  --rule: #b89a63;
  --row-alt: rgb(139 101 45 / 0.08);
  --overlay: rgb(40 25 10 / 0.45);
  --seal-text: #fdf8ec;
  --seal-common: #5f6368;
  --seal-uncommon: #3f6b36;
  --seal-rare: #1f4e8c;
  --seal-very_rare: #6a2c82;
  --seal-legendary: #95600b;
  --seal-artifact: #9b1b30;
}

@media (prefers-color-scheme: dark) {
  :root {
    --parchment: #2a1f15;
    --parchment-deep: #1d150e;
    --ink: #f1e4c6;
    --ink-soft: #d2bd97;
    --blood: #e58a78;
    --gold: #d4ae5f;
    --rule: #7a6140;
    --row-alt: rgb(241 228 198 / 0.06);
    --overlay: rgb(0 0 0 / 0.6);
  }
}

@theme inline {
  --color-parchment: var(--parchment);
  --color-parchment-deep: var(--parchment-deep);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-blood: var(--blood);
  --color-gold: var(--gold);
  --color-rule: var(--rule);
  --font-title: var(--font-im-fell-sc);
  --font-body: var(--font-crimson);
  --font-numbers: var(--font-im-fell-pica);
}

body {
  min-height: 100dvh;
  color: var(--ink);
  background-color: var(--parchment);
  background-image:
    radial-gradient(ellipse at top left, rgb(255 255 255 / 0.3), transparent 60%),
    radial-gradient(ellipse at bottom right, rgb(110 70 20 / 0.2), transparent 55%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.1 0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-attachment: fixed;
  font-family: var(--font-body), Georgia, serif;
  font-size: 1.0625rem;
}

@layer components {
  .title {
    font-family: var(--font-title), Georgia, serif;
    color: var(--blood);
    letter-spacing: 0.02em;
  }

  .numbers {
    font-family: var(--font-numbers), Georgia, serif;
    font-variant-numeric: tabular-nums;
  }

  .frame {
    position: relative;
    border: 3px double var(--gold);
    background-color: var(--parchment);
    box-shadow:
      0 1px 0 var(--rule),
      0 6px 14px rgb(60 40 15 / 0.15);
  }

  .seal {
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    padding: 0.05rem 0.6rem;
    font-family: var(--font-title), Georgia, serif;
    font-size: 0.8rem;
    color: var(--seal-text);
    box-shadow:
      inset 0 0 0 1px rgb(0 0 0 / 0.25),
      0 1px 1px rgb(0 0 0 / 0.3);
  }
  .seal-common { background-color: var(--seal-common); }
  .seal-uncommon { background-color: var(--seal-uncommon); }
  .seal-rare { background-color: var(--seal-rare); }
  .seal-very_rare { background-color: var(--seal-very_rare); }
  .seal-legendary { background-color: var(--seal-legendary); }
  .seal-artifact { background-color: var(--seal-artifact); }

  .drop-cap::first-letter {
    float: left;
    padding: 0.05em 0.12em 0 0;
    font-family: var(--font-title), Georgia, serif;
    font-size: 2.6em;
    line-height: 0.8;
    color: var(--blood);
    text-shadow: 1px 1px 0 var(--gold);
  }

  .old-table {
    border-collapse: collapse;
  }
  .old-table thead th {
    padding: 0.25rem 0.5rem;
    border-bottom: 2px solid var(--blood);
    font-family: var(--font-title), Georgia, serif;
    font-variant: small-caps;
    font-weight: normal;
    color: var(--blood);
  }
  .old-table tbody td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }
  .old-table tbody tr:nth-child(even) {
    background-color: var(--row-alt);
  }

  .btn {
    border: 1px solid var(--gold);
    background-color: var(--parchment-deep);
    padding: 0.35rem 0.9rem;
    font-family: var(--font-title), Georgia, serif;
    color: var(--ink);
  }
  .btn:hover:not(:disabled) {
    border-color: var(--blood);
  }
  .btn:disabled {
    opacity: 0.5;
  }
  .btn-primary {
    border-color: var(--blood);
    background-color: var(--blood);
    color: var(--parchment);
  }

  .field {
    width: 100%;
    border: 1px solid var(--rule);
    background-color: var(--parchment-deep);
    padding: 0.35rem 0.5rem;
    color: var(--ink);
  }
  .field:disabled {
    opacity: 0.5;
  }
}

:focus-visible {
  outline: 2px solid var(--blood);
  outline-offset: 2px;
}
```

**Step 2: `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Crimson_Pro, IM_Fell_DW_Pica, IM_Fell_English_SC } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const titleFont = IM_Fell_English_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-im-fell-sc",
});
const bodyFont = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson" });
const numbersFont = IM_Fell_DW_Pica({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-im-fell-pica",
});

export const metadata: Metadata = {
  title: "Lojinha de Itens Mágicos",
  description: "Gerador de lojas de itens mágicos para D&D 2024",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${titleFont.variable} ${bodyFont.variable} ${numbersFont.variable}`}
    >
      <body>
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="title text-2xl sm:text-3xl">
            Lojinha de Itens Mágicos
          </Link>
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            className="text-2xl text-ink-soft hover:text-blood"
          >
            ⚙
          </Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
```

**Step 3: `src/app/page.tsx` provisório**

```tsx
export default function HomePage() {
  return (
    <section className="frame p-6">
      <h1 className="title drop-cap text-3xl">Lojas</h1>
      <p className="numbers">4.000 PO</p>
      <span className="seal seal-rare">Raro</span>
    </section>
  );
}
```

**Step 4: Verificar visualmente**

```bash
npm run build
npm run dev
```

Abra `http://localhost:3000` no navegador. Confira: fundo de pergaminho com ruído, título em versalete vermelho com capitular, número na fonte de tabela, selo azul. Troque o sistema para modo escuro e confira o fundo marrom e o texto creme. Pare o servidor.

**Step 5: Commit**

```bash
git add src/app
git commit -m "feat: add parchment theme, fonts and base layout"
```

---

### Tarefa 20: Estado global (`ShopsProvider`)

O provider carrega as lojas do `Storage`, guarda em memória, grava com debounce de 500 ms, grava na hora ao esconder a página e cria snapshot automático (no máximo um a cada 5 minutos).

**Files:**
- Create: `src/components/ShopsProvider.tsx`
- Create: `src/components/ShopsProvider.test.tsx`
- Create: `src/test/renderWithShops.tsx`

**Step 1: Helper de teste**

`src/test/renderWithShops.tsx`:

```tsx
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ShopsProvider, type AppDeps } from "@/components/ShopsProvider";
import { mulberry32 } from "@/lib/random";
import { saveShops } from "@/lib/storage";
import type { Shop } from "@/lib/types";
import { makeDeps } from "@/lib/__fixtures__/deps";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";

export function testDeps(): AppDeps {
  const deps = makeDeps("2026-09-22T12:00:00.000Z");
  return { now: deps.now, newId: deps.newId, rng: mulberry32(1) };
}

interface Options {
  shops?: Shop[];
  storage?: Storage;
  deps?: AppDeps;
}

/** Grava `shops` no storage falso e renderiza `ui` dentro do ShopsProvider. */
export function renderWithShops(
  ui: ReactElement,
  { shops = [], storage = memoryStorage(), deps = testDeps() }: Options = {},
) {
  saveShops(storage, shops, deps);
  const result = render(
    <ShopsProvider storage={storage} deps={deps}>
      {ui}
    </ShopsProvider>,
  );
  return { ...result, storage, deps };
}
```

**Step 2: Testes que falham**

`src/components/ShopsProvider.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShopsProvider, SAVE_DELAY_MS, useShops } from "./ShopsProvider";
import { SHOPS_KEY, listSnapshots, loadShops, saveShops } from "@/lib/storage";
import { makeShop } from "@/lib/__fixtures__/shop";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { testDeps } from "@/test/renderWithShops";

function Probe() {
  const { shops, loaded, error, upsertShop } = useShops();
  return (
    <div>
      <p>{loaded ? "carregado" : "carregando"}</p>
      <p data-testid="error">{error ?? "sem erro"}</p>
      <ul>
        {shops.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
      <button onClick={() => upsertShop(makeShop({ id: "nova", name: "Loja Nova" }))}>criar</button>
    </div>
  );
}

function renderProbe(storage: Storage | null) {
  return render(
    <ShopsProvider storage={storage} deps={testDeps()}>
      <Probe />
    </ShopsProvider>,
  );
}

const savedNames = (storage: Storage) => {
  const result = loadShops(storage);
  return result.ok ? result.value.map((s) => s.name) : result.error;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ShopsProvider", () => {
  it("carrega as lojas salvas", () => {
    const storage = memoryStorage();
    saveShops(storage, [makeShop({ name: "Loja A" })], testDeps());
    renderProbe(storage);
    expect(screen.getByText("carregado")).toBeInTheDocument();
    expect(screen.getByText("Loja A")).toBeInTheDocument();
  });

  it("grava 500 ms depois da última mudança", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS - 1));
    expect(savedNames(storage)).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(savedNames(storage)).toEqual(["Loja Nova"]);
  });

  it("carimba updatedAt com o relógio injetado", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS));
    const result = loadShops(storage);
    expect(result.ok && result.value[0].updatedAt).toBe("2026-09-22T12:00:00.000Z");
  });

  it("cria snapshot automático ao gravar", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS));
    expect(listSnapshots(storage)).toHaveLength(1);
  });

  it("grava na hora quando a página é escondida", () => {
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(savedNames(storage)).toEqual(["Loja Nova"]);
  });

  it("acusa dados corrompidos e não os sobrescreve", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    renderProbe(storage);
    expect(screen.getByTestId("error")).toHaveTextContent("corrupt");
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 2));
    expect(storage.getItem(SHOPS_KEY)).toBe("{lixo");
  });

  it("acusa storage indisponível e continua funcionando em memória", () => {
    renderProbe(null);
    expect(screen.getByTestId("error")).toHaveTextContent("unavailable");
    fireEvent.click(screen.getByText("criar"));
    expect(screen.getByText("Loja Nova")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/components/ShopsProvider.test.tsx`
Expected: FAIL por import (`./ShopsProvider`).

**Step 3: Implementar**

`src/components/ShopsProvider.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Rng } from "@/lib/random";
import { removeShopFromList, upsertShopInList } from "@/lib/shop";
import { loadShops, maybeAutoSnapshot, saveShops, type StorageError } from "@/lib/storage";
import type { Shop } from "@/lib/types";

export const SAVE_DELAY_MS = 500;

export interface AppDeps {
  now: () => Date;
  newId: () => string;
  rng: Rng;
}

export interface ShopsContextValue {
  shops: Shop[];
  loaded: boolean;
  error: StorageError | null;
  storage: Storage | null;
  deps: AppDeps;
  upsertShop: (shop: Shop) => void;
  deleteShop: (id: string) => void;
  /** Troca a lista inteira por dados que já foram gravados (importação, restauração). */
  replaceAll: (shops: Shop[]) => void;
}

const ShopsContext = createContext<ShopsContextValue | null>(null);

const browserDeps: AppDeps = {
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
  rng: Math.random,
};

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface ShopsProviderProps {
  children: ReactNode;
  /** `undefined` usa o localStorage do navegador; `null` simula storage indisponível. */
  storage?: Storage | null;
  deps?: AppDeps;
}

export function ShopsProvider({ children, storage: injected, deps = browserDeps }: ShopsProviderProps) {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<StorageError | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    const target = injected === undefined ? browserStorage() : injected;
    setStorage(target);
    if (!target) {
      setError("unavailable");
    } else {
      const result = loadShops(target);
      if (result.ok) setShops(result.value);
      else setError(result.error);
    }
    setLoaded(true);
  }, [injected]);

  const canSave = storage !== null && error !== "corrupt" && error !== "unavailable";

  const flush = useCallback(() => {
    if (!dirty.current || !storage || !canSave) return;
    dirty.current = false;
    const result = saveShops(storage, shops, deps);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    maybeAutoSnapshot(storage, shops, deps);
  }, [storage, canSave, shops, deps]);

  useEffect(() => {
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [flush]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const upsertShop = useCallback(
    (shop: Shop) => {
      dirty.current = true;
      const stamped = { ...shop, updatedAt: deps.now().toISOString() };
      setShops((prev) => upsertShopInList(prev, stamped));
    },
    [deps],
  );

  const deleteShop = useCallback((id: string) => {
    dirty.current = true;
    setShops((prev) => removeShopFromList(prev, id));
  }, []);

  const replaceAll = useCallback((next: Shop[]) => {
    dirty.current = false;
    setShops(next);
    setError(null);
  }, []);

  const value = useMemo<ShopsContextValue>(
    () => ({ shops, loaded, error, storage, deps, upsertShop, deleteShop, replaceAll }),
    [shops, loaded, error, storage, deps, upsertShop, deleteShop, replaceAll],
  );

  return <ShopsContext.Provider value={value}>{children}</ShopsContext.Provider>;
}

export function useShops(): ShopsContextValue {
  const context = useContext(ShopsContext);
  if (!context) throw new Error("useShops precisa estar dentro de <ShopsProvider>");
  return context;
}
```

Se o `npm run lint` acusar `react-hooks/set-state-in-effect` no primeiro `useEffect`: este é o caso legítimo de sincronizar com um sistema externo (o `localStorage`), que só existe no navegador. Acrescente, apenas nas linhas acusadas, `// eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do localStorage`. Não desligue a regra no projeto.

Run: `npx vitest run src/components/ShopsProvider.test.tsx`
Expected: PASS (7 testes).

**Step 4: Commit**

```bash
git add src/components/ShopsProvider.tsx src/components/ShopsProvider.test.tsx src/test/renderWithShops.tsx
git commit -m "feat: add ShopsProvider with debounced save and auto snapshots"
```

---

### Tarefa 21: Aviso de armazenamento e ligação no layout

**Files:**
- Create: `src/components/StorageBanner.tsx`
- Create: `src/components/StorageBanner.test.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Testes que falham**

`renderWithShops` sempre grava as lojas no storage antes de renderizar, o que apagaria os dados corrompidos. Por isso os testes de erro usam o `ShopsProvider` direto.

`src/components/StorageBanner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopsProvider } from "./ShopsProvider";
import { StorageBanner } from "./StorageBanner";
import { SHOPS_KEY } from "@/lib/storage";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { renderWithShops, testDeps } from "@/test/renderWithShops";

describe("StorageBanner", () => {
  it("não aparece quando está tudo bem", () => {
    renderWithShops(<StorageBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("avisa sobre dados corrompidos e aponta para as configurações", () => {
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    render(
      <ShopsProvider storage={storage} deps={testDeps()}>
        <StorageBanner />
      </ShopsProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/corrompidos/);
    expect(screen.getByRole("link", { name: "Abrir configurações" })).toHaveAttribute(
      "href",
      "/configuracoes",
    );
  });

  it("avisa quando o armazenamento está indisponível", () => {
    render(
      <ShopsProvider storage={null} deps={testDeps()}>
        <StorageBanner />
      </ShopsProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/não serão salvas/);
  });
});
```

Run: FAIL por import (`./StorageBanner`).

**Step 2: Implementar**

`src/components/StorageBanner.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { StorageError } from "@/lib/storage";
import { useShops } from "./ShopsProvider";

const MESSAGES: Record<StorageError, string> = {
  unavailable:
    "Não foi possível acessar o armazenamento do navegador. As alterações não serão salvas. Exporte um backup antes de fechar a página.",
  quota: "O armazenamento do navegador está cheio. Exporte um backup para não perder alterações.",
  corrupt:
    "Os dados salvos estão corrompidos e não foram carregados. Importe um backup ou restaure um snapshot.",
};

export function StorageBanner() {
  const { error } = useShops();
  if (!error) return null;
  return (
    <div role="alert" className="frame mx-auto mb-4 max-w-6xl border-blood p-3 text-sm">
      {MESSAGES[error]}{" "}
      <Link href="/configuracoes" className="underline">
        Abrir configurações
      </Link>
    </div>
  );
}
```

Run: PASS (3 testes).

**Step 3: Ligar provider e aviso no layout**

Em `src/app/layout.tsx`, importe `ShopsProvider` e `StorageBanner` e envolva o conteúdo do `<body>`:

```tsx
      <body>
        <ShopsProvider>
          <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            {/* ...links do cabeçalho, sem mudança... */}
          </header>
          <div className="px-4">
            <StorageBanner />
          </div>
          <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
        </ShopsProvider>
      </body>
```

Run: `npm run build`
Expected: build sem erros.

**Step 4: Commit**

```bash
git add src/components/StorageBanner.tsx src/components/StorageBanner.test.tsx src/app/layout.tsx
git commit -m "feat: show storage warnings and wire ShopsProvider into layout"
```

---

### Tarefa 22: Selo de raridade e ícones de tipo

**Files:**
- Create: `src/components/RaritySeal.tsx`
- Create: `src/components/TypeIcon.tsx`
- Create: `src/components/RaritySeal.test.tsx`
- Create: `src/components/TypeIcon.test.tsx`

**Step 1: Testes que falham**

`src/components/RaritySeal.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RaritySeal } from "./RaritySeal";

describe("RaritySeal", () => {
  it("mostra o nome da raridade em português", () => {
    render(<RaritySeal rarity="very_rare" />);
    expect(screen.getByText("Muito Raro")).toBeInTheDocument();
  });

  it("mostra a sigla no modo curto, com o nome completo no título", () => {
    render(<RaritySeal rarity="very_rare" short />);
    expect(screen.getByText("VR")).toHaveAttribute("title", "Muito Raro");
  });
});
```

`src/components/TypeIcon.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypeIcon } from "./TypeIcon";
import { TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES } from "@/lib/types";

describe("TypeIcon", () => {
  it.each(ITEM_TYPES)("tem nome acessível para o tipo %s", (type) => {
    render(<TypeIcon type={type} />);
    expect(screen.getByRole("img", { name: TYPE_LABEL[type] })).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/components/RaritySeal.test.tsx src/components/TypeIcon.test.tsx`
Expected: FAIL por import.

**Step 2: Implementar**

`src/components/RaritySeal.tsx`:

```tsx
import { RARITY_LABEL, RARITY_SHORT } from "@/lib/labels";
import type { Rarity } from "@/lib/types";

export function RaritySeal({ rarity, short = false }: { rarity: Rarity; short?: boolean }) {
  return (
    <span className={`seal seal-${rarity}`} title={RARITY_LABEL[rarity]}>
      {short ? RARITY_SHORT[rarity] : RARITY_LABEL[rarity]}
    </span>
  );
}
```

`src/components/TypeIcon.tsx` (traços simples, estilo xilogravura):

```tsx
import { TYPE_LABEL } from "@/lib/labels";
import type { ItemType } from "@/lib/types";

const PATHS: Record<ItemType, string[]> = {
  armor: ["M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z", "M12 3v18", "M5 11h14"],
  potion: [
    "M9.5 3h5",
    "M10.5 3v5L6 16a4 4 0 0 0 3.5 5h5a4 4 0 0 0 3.5-5L13.5 8V3",
    "M7.5 14h9",
  ],
  ring: ["M18 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0z", "M9.5 5.5 12 3l2.5 2.5L12 8z"],
  rod: ["M5 19 16 8", "M14.5 5.5l4 4", "M16 8l2.5-2.5", "M3.5 20.5 5 19"],
  scroll: [
    "M7 4h11a2 2 0 0 1 0 4H7",
    "M7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4H9",
    "M10 11h6",
    "M10 14h4",
  ],
  staff: ["M12 21V9", "M14.5 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z", "M10 21h4"],
  wand: ["M4 20 15 9", "M17 3v4", "M15 5h4", "M20 10v2", "M19 11h2"],
  weapon: ["M20 4 9 15", "M20 4h-4", "M20 4v4", "M7 13l4 4", "M8 16l-4 4"],
  wondrous: ["M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.4 7 18.2l1.2-5.6L4 8.8l5.6-.6z"],
};

export function TypeIcon({ type, className }: { type: ItemType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={TYPE_LABEL[type]}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[type].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
```

Run: PASS (11 testes).

**Step 3: Commit**

```bash
git add src/components/RaritySeal.tsx src/components/TypeIcon.tsx src/components/RaritySeal.test.tsx src/components/TypeIcon.test.tsx
git commit -m "feat: add rarity seal and item type icons"
```

---

### Tarefa 23: Componentes base (modal, confirmação e campos)

**Files:**
- Create: `src/components/Modal.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/ConfirmDialog.test.tsx`
- Create: `src/components/fields.tsx`

**Step 1: Testes que falham**

`src/components/ConfirmDialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Excluir loja"
      message="Tem certeza?"
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel, user: userEvent.setup() };
}

describe("ConfirmDialog", () => {
  it("mostra título e mensagem num diálogo", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Excluir loja" })).toHaveTextContent("Tem certeza?");
  });

  it("confirma pelo botão de confirmação", async () => {
    const { onConfirm, onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancela pelo botão Cancelar", async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancela com Esc", async () => {
    const { onCancel, user } = setup();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/Modal.tsx`:

```tsx
"use client";

import { useEffect, useId, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="frame max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="title mb-4 text-2xl">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
```

`src/components/ConfirmDialog.tsx`:

```tsx
"use client";

import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
```

`src/components/fields.tsx` (usados e testados pelos componentes das próximas tarefas):

```tsx
interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TextField({ label, value, onChange, placeholder, autoFocus }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, rows = 4 }: TextAreaFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <textarea
        className="field"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  /** NaN mostra o campo vazio. */
  value: number;
  /** Recebe NaN quando o campo fica vazio. */
  onChange: (value: number) => void;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberField({ label, value, onChange, min, disabled, placeholder }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input
        type="number"
        className="field numbers"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
        }
      />
    </label>
  );
}
```

Run: `npx vitest run src/components/ConfirmDialog.test.tsx`
Expected: PASS (4 testes).

**Step 3: Commit**

```bash
git add src/components/Modal.tsx src/components/ConfirmDialog.tsx src/components/ConfirmDialog.test.tsx src/components/fields.tsx
git commit -m "feat: add modal, confirm dialog and form fields"
```

---

### Tarefa 24: Card da loja (`ShopCard`)

**Files:**
- Create: `src/components/ShopCard.tsx`
- Create: `src/components/ShopCard.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShopCard } from "./ShopCard";
import { indexCatalog } from "@/lib/catalog";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop, makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const shop = makeShop({
  id: "a",
  name: "Forja Rúnica",
  location: "Mirabar",
  kind: "Ferreiro",
  items: [
    makeShopItem("potion-of-healing"),
    makeShopItem("common-wondrous-1"),
    makeShopItem("armor-plus-1"),
  ],
});

function setup(overrides = {}) {
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  render(
    <ShopCard
      shop={{ ...shop, ...overrides }}
      catalogIndex={index}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />,
  );
  return { onDuplicate, onDelete, user: userEvent.setup() };
}

describe("ShopCard", () => {
  it("mostra nome com link, local, tipo e chips de raridade", () => {
    setup();
    expect(screen.getByRole("link", { name: "Forja Rúnica" })).toHaveAttribute("href", "/loja/a");
    expect(screen.getByText("Mirabar · Ferreiro")).toBeInTheDocument();
    expect(screen.getByText("2 C · 1 R")).toBeInTheDocument();
  });

  it("mostra 'Sem itens' para loja vazia", () => {
    setup({ items: [] });
    expect(screen.getByText("Sem itens")).toBeInTheDocument();
  });

  it("duplica pelo menu", async () => {
    const { onDuplicate, user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });

  it("só exclui depois da confirmação", async () => {
    const { onDelete, user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ShopCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { countByRarity, formatRarityChips } from "@/lib/shop";
import type { CatalogItem, Shop } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface ShopCardProps {
  shop: Shop;
  catalogIndex: ReadonlyMap<string, CatalogItem>;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ShopCard({ shop, catalogIndex, onDuplicate, onDelete }: ShopCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const name = shop.name || "Loja sem nome";
  const chips = formatRarityChips(countByRarity(shop.items, catalogIndex));
  const subtitle = [shop.location, shop.kind].filter(Boolean).join(" · ");

  return (
    <article className="frame corners flex flex-col gap-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="title drop-cap text-xl">
          <Link href={`/loja/${shop.id}`} className="hover:underline">
            {name}
          </Link>
        </h2>
        <div className="relative">
          <button
            type="button"
            className="px-2 text-xl text-ink-soft hover:text-blood"
            aria-label={`Ações de ${name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </button>
          {menuOpen && (
            <div role="menu" className="frame absolute right-0 z-10 flex min-w-32 flex-col p-1">
              <button
                type="button"
                role="menuitem"
                className="px-3 py-1 text-left hover:text-blood"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                Duplicar
              </button>
              <button
                type="button"
                role="menuitem"
                className="px-3 py-1 text-left hover:text-blood"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(true);
                }}
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>
      {subtitle && <p className="text-ink-soft">{subtitle}</p>}
      <p className="numbers mt-2">{chips || "Sem itens"}</p>
      {confirming && (
        <ConfirmDialog
          title="Excluir loja"
          message={`Excluir "${name}"? Se precisar voltar atrás, restaure um snapshot em Configurações.`}
          confirmLabel="Excluir"
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </article>
  );
}
```

A classe `corners` (cantos ornamentados) é definida na Tarefa 36; até lá ela não tem efeito.

Run: PASS (4 testes).

**Step 3: Commit**

```bash
git add src/components/ShopCard.tsx src/components/ShopCard.test.tsx
git commit -m "feat: add shop card with duplicate and delete menu"
```

---

### Tarefa 25: Modal "Nova loja"

**Files:**
- Create: `src/components/NewShopDialog.tsx`
- Create: `src/components/NewShopDialog.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewShopDialog } from "./NewShopDialog";

describe("NewShopDialog", () => {
  it("não deixa criar sem nome", () => {
    render(<NewShopDialog onCreate={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Criar loja" })).toBeDisabled();
  });

  it("envia nome, local e tipo", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewShopDialog onCreate={onCreate} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText("Nome"), "A Lâmpada");
    await user.type(screen.getByLabelText("Local"), "Calimport");
    await user.type(screen.getByLabelText("Tipo de loja"), "Bazar");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "A Lâmpada", location: "Calimport", kind: "Bazar" });
  });

  it("cancela", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<NewShopDialog onCreate={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/NewShopDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { NewShopInput } from "@/lib/shop";
import { TextField } from "./fields";
import { Modal } from "./Modal";

interface NewShopDialogProps {
  onCreate: (input: NewShopInput) => void;
  onCancel: () => void;
}

export function NewShopDialog({ onCreate, onCancel }: NewShopDialogProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState("");
  const canCreate = name.trim() !== "";

  return (
    <Modal title="Nova loja" onClose={onCancel}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canCreate) onCreate({ name, location, kind });
        }}
      >
        <TextField label="Nome" value={name} onChange={setName} autoFocus />
        <TextField label="Local" value={location} onChange={setLocation} />
        <TextField
          label="Tipo de loja"
          value={kind}
          onChange={setKind}
          placeholder="Ferreiro, alquimista, antiquário…"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canCreate}>
            Criar loja
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

Run: PASS (3 testes).

**Step 3: Commit**

```bash
git add src/components/NewShopDialog.tsx src/components/NewShopDialog.test.tsx
git commit -m "feat: add new shop dialog"
```

---

### Tarefa 26: Tela inicial (`HomeView` e `/`)

**Files:**
- Create: `src/components/HomeView.tsx`
- Create: `src/components/HomeView.test.tsx`
- Modify: `src/app/page.tsx` (substituir o provisório)

**Step 1: Testes que falham**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "./HomeView";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shops = [
  makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar" }),
  makeShop({ id: "b", name: "Bazar das Areias", location: "Calimport" }),
];

function setup(initial = shops) {
  const onOpenShop = vi.fn();
  renderWithShops(<HomeView catalog={fixtureCatalog} onOpenShop={onOpenShop} />, { shops: initial });
  return { onOpenShop, user: userEvent.setup() };
}

describe("HomeView", () => {
  it("lista as lojas em cards", () => {
    setup();
    expect(screen.getByRole("link", { name: "Forja Rúnica" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bazar das Areias" })).toBeInTheDocument();
  });

  it("convida a criar a primeira loja quando não há nenhuma", () => {
    setup([]);
    expect(screen.getByText("Nenhuma loja ainda. Crie a primeira.")).toBeInTheDocument();
  });

  it("busca por nome ou local", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Buscar por nome ou local" }), "calim");
    expect(screen.queryByRole("link", { name: "Forja Rúnica" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bazar das Areias" })).toBeInTheDocument();
  });

  it("cria loja e abre a página dela", async () => {
    const { onOpenShop, user } = setup([]);
    await user.click(screen.getByRole("button", { name: "Nova loja" }));
    await user.type(screen.getByLabelText("Nome"), "A Lâmpada");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));
    expect(onOpenShop).toHaveBeenCalledWith("id-1");
    expect(screen.getByRole("link", { name: "A Lâmpada" })).toBeInTheDocument();
  });

  it("duplica uma loja", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(screen.getByRole("link", { name: "Forja Rúnica (cópia)" })).toBeInTheDocument();
  });

  it("exclui uma loja depois de confirmar", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(screen.queryByRole("link", { name: "Forja Rúnica" })).not.toBeInTheDocument();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/HomeView.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { indexCatalog } from "@/lib/catalog";
import { createShop, duplicateShop, filterShops } from "@/lib/shop";
import type { CatalogItem } from "@/lib/types";
import { NewShopDialog } from "./NewShopDialog";
import { ShopCard } from "./ShopCard";
import { useShops } from "./ShopsProvider";

interface HomeViewProps {
  catalog: readonly CatalogItem[];
  onOpenShop: (id: string) => void;
}

export function HomeView({ catalog, onOpenShop }: HomeViewProps) {
  const { shops, loaded, deps, upsertShop, deleteShop } = useShops();
  const index = useMemo(() => indexCatalog(catalog), [catalog]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  if (!loaded) return <p>Carregando…</p>;
  const visible = filterShops(shops, query);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="title flex-1 text-3xl">Lojas</h1>
        <input
          type="search"
          className="field max-w-xs"
          aria-label="Buscar por nome ou local"
          placeholder="Buscar por nome ou local"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          Nova loja
        </button>
      </div>

      {shops.length === 0 ? (
        <p>Nenhuma loja ainda. Crie a primeira.</p>
      ) : visible.length === 0 ? (
        <p>Nenhuma loja encontrada.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              catalogIndex={index}
              onDuplicate={() => upsertShop(duplicateShop(shop, deps))}
              onDelete={() => deleteShop(shop.id)}
            />
          ))}
        </div>
      )}

      {creating && (
        <NewShopDialog
          onCancel={() => setCreating(false)}
          onCreate={(input) => {
            const shop = createShop(input, deps);
            upsertShop(shop);
            setCreating(false);
            onOpenShop(shop.id);
          }}
        />
      )}
    </section>
  );
}
```

`src/app/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { HomeView } from "@/components/HomeView";
import { CATALOG } from "@/lib/catalogData";

export default function HomePage() {
  const router = useRouter();
  return <HomeView catalog={CATALOG} onOpenShop={(id) => router.push(`/loja/${id}`)} />;
}
```

Run: `npx vitest run src/components/HomeView.test.tsx`
Expected: PASS (6 testes).

**Step 3: Commit**

```bash
git add src/components/HomeView.tsx src/components/HomeView.test.tsx src/app/page.tsx
git commit -m "feat: add shop grid home page with search and new shop"
```

---

### Tarefa 27: Formulário de geração (`GeneratorForm`)

**Files:**
- Modify: `src/lib/config.ts` e `src/lib/config.test.ts` (função `evenWeights`)
- Create: `src/components/GeneratorForm.tsx`
- Create: `src/components/GeneratorForm.test.tsx`

**Step 1: `evenWeights` — teste que falha**

Em `src/lib/config.test.ts` (acrescente `evenWeights` ao import):

```ts
describe("evenWeights", () => {
  it("divide 100% igualmente entre os tipos marcados", () => {
    expect(evenWeights(["weapon", "ring", "wondrous"])).toEqual({ weapon: 33, ring: 33, wondrous: 33 });
  });

  it("devolve objeto vazio sem tipos", () => {
    expect(evenWeights([])).toEqual({});
  });
});
```

Run e veja falhar. Implemente em `src/lib/config.ts`:

```ts
export function evenWeights(types: readonly ItemType[]): Partial<Record<ItemType, number>> {
  if (types.length === 0) return {};
  const share = Math.floor(100 / types.length);
  return Object.fromEntries(types.map((t) => [t, share]));
}
```

Run: PASS.

**Step 2: Testes do formulário (falham)**

`src/components/GeneratorForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GeneratorForm } from "./GeneratorForm";
import { defaultGenConfig } from "@/lib/config";
import type { GenConfig } from "@/lib/types";

function setup(initial: GenConfig = defaultGenConfig()) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <GeneratorForm initial={initial} submitLabel="Gerar itens" onSubmit={onSubmit} onCancel={onCancel} />,
  );
  const submitted = (): GenConfig => onSubmit.mock.calls[0][0];
  return { onSubmit, onCancel, submitted, user: userEvent.setup() };
}

describe("GeneratorForm", () => {
  it("envia a configuração inicial", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted()).toEqual(defaultGenConfig());
  });

  it("altera a quantidade de uma raridade", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Raro"));
    await user.type(screen.getByLabelText("Raro"), "5");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().rarityCounts.rare).toBe(5);
  });

  it("campo vazio vira zero ao enviar", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Comum"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().rarityCounts.common).toBe(0);
  });

  it("desmarcar um tipo tira ele do sorteio", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByLabelText("Anel"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().types).not.toContain("ring");
  });

  it("modo percentual envia pesos por tipo", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByLabelText("Percentual por tipo"));
    await user.clear(screen.getByLabelText("Peso de Arma (%)"));
    await user.type(screen.getByLabelText("Peso de Arma (%)"), "70");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().typeWeights).toMatchObject({ weapon: 70, ring: 11 });
  });

  it("voltar para tudo randômico remove os pesos", async () => {
    const { submitted, user } = setup({ ...defaultGenConfig(), typeWeights: { weapon: 100 } });
    await user.click(screen.getByLabelText("Tudo randômico"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().typeWeights).toBeUndefined();
  });

  it("quantidade de artefatos só habilita com Incluir artefatos", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Artefato")).toBeDisabled();
    await user.click(screen.getByLabelText("Incluir artefatos"));
    expect(screen.getByLabelText("Artefato")).toBeEnabled();
  });

  it("envia faixas de consumíveis e percentuais de preço", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Poções — máximo"));
    await user.type(screen.getByLabelText("Poções — máximo"), "6");
    await user.clear(screen.getByLabelText("Percentual geral da loja (%)"));
    await user.type(screen.getByLabelText("Percentual geral da loja (%)"), "-10");
    await user.click(screen.getByLabelText("Permitir itens repetidos"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted()).toMatchObject({
      qtyRange: { potion: [1, 6], scroll: [1, 5] },
      generalMod: -10,
      allowRepeat: true,
    });
  });

  it("cancela", async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

Run: FAIL por import.

**Step 3: Implementar**

`src/components/GeneratorForm.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { evenWeights, sanitizeConfig } from "@/lib/config";
import { RARITY_LABEL, TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES, RARITIES, type GenConfig, type ItemType, type Rarity } from "@/lib/types";
import { NumberField } from "./fields";

interface GeneratorFormProps {
  initial: GenConfig;
  submitLabel: string;
  onSubmit: (config: GenConfig) => void;
  onCancel?: () => void;
}

type RangeKind = "potion" | "scroll";

export function GeneratorForm({ initial, submitLabel, onSubmit, onCancel }: GeneratorFormProps) {
  const [config, setConfig] = useState<GenConfig>(initial);
  const byWeights = config.typeWeights !== undefined;

  const patch = (changes: Partial<GenConfig>) => setConfig((c) => ({ ...c, ...changes }));

  const setCount = (rarity: Rarity, value: number) =>
    setConfig((c) => ({ ...c, rarityCounts: { ...c.rarityCounts, [rarity]: value } }));

  const toggleType = (type: ItemType) =>
    setConfig((c) => ({
      ...c,
      types: c.types.includes(type)
        ? c.types.filter((t) => t !== type)
        : ITEM_TYPES.filter((t) => t === type || c.types.includes(t)),
    }));

  const setWeight = (type: ItemType, value: number) =>
    setConfig((c) => ({ ...c, typeWeights: { ...c.typeWeights, [type]: value } }));

  const setRange = (kind: RangeKind, position: 0 | 1, value: number) =>
    setConfig((c) => {
      const range = [...c.qtyRange[kind]] as [number, number];
      range[position] = value;
      return { ...c, qtyRange: { ...c.qtyRange, [kind]: range } };
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(sanitizeConfig(config));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Quantidade por raridade</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RARITIES.map((rarity) => (
            <NumberField
              key={rarity}
              label={RARITY_LABEL[rarity]}
              value={config.rarityCounts[rarity]}
              min={0}
              disabled={rarity === "artifact" && !config.includeArtifacts}
              onChange={(value) => setCount(rarity, value)}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.includeArtifacts}
            onChange={(event) => patch({ includeArtifacts: event.target.checked })}
          />
          Incluir artefatos
        </label>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Tipos de item</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ITEM_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Distribuição por tipo</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="distribution"
              checked={!byWeights}
              onChange={() => patch({ typeWeights: undefined })}
            />
            Tudo randômico
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="distribution"
              checked={byWeights}
              onChange={() => setConfig((c) => ({ ...c, typeWeights: evenWeights(c.types) }))}
            />
            Percentual por tipo
          </label>
        </div>
        {byWeights && (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              Os percentuais funcionam como proporções. O resultado se aproxima deles, sem ser exato.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {config.types.map((type) => (
                <NumberField
                  key={type}
                  label={`Peso de ${TYPE_LABEL[type]} (%)`}
                  value={config.typeWeights?.[type] ?? 0}
                  min={0}
                  onChange={(value) => setWeight(type, value)}
                />
              ))}
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Consumíveis e repetição</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Poções — mínimo" value={config.qtyRange.potion[0]} min={1} onChange={(v) => setRange("potion", 0, v)} />
          <NumberField label="Poções — máximo" value={config.qtyRange.potion[1]} min={1} onChange={(v) => setRange("potion", 1, v)} />
          <NumberField label="Pergaminhos — mínimo" value={config.qtyRange.scroll[0]} min={1} onChange={(v) => setRange("scroll", 0, v)} />
          <NumberField label="Pergaminhos — máximo" value={config.qtyRange.scroll[1]} min={1} onChange={(v) => setRange("scroll", 1, v)} />
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.allowRepeat}
            onChange={(event) => patch({ allowRepeat: event.target.checked })}
          />
          Permitir itens repetidos
        </label>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Preço</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Variação aleatória (±%)"
            value={config.randomVariance}
            min={0}
            onChange={(value) => patch({ randomVariance: value })}
          />
          <NumberField
            label="Percentual geral da loja (%)"
            value={config.generalMod}
            onChange={(value) => patch({ generalMod: value })}
          />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
```

Run: `npx vitest run src/components/GeneratorForm.test.tsx src/lib/config.test.ts`
Expected: PASS. Se o `typecheck` reclamar dos objetos com chave calculada (`[rarity]: value`), troque por uma cópia explícita, por exemplo `const counts = { ...c.rarityCounts }; counts[rarity] = value; return { ...c, rarityCounts: counts };`.

**Step 4: Commit**

```bash
git add src/lib/config.ts src/lib/config.test.ts src/components/GeneratorForm.tsx src/components/GeneratorForm.test.tsx
git commit -m "feat: add generation form"
```

---

### Tarefa 28: Lista de itens (`ItemList`)

**Files:**
- Create: `src/components/ItemList.tsx`
- Create: `src/components/ItemList.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemList } from "./ItemList";
import { indexCatalog } from "@/lib/catalog";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const items = [
  makeShopItem("ring-of-protection", { priceMods: { random: 0, individual: 10 } }),
  makeShopItem("potion-of-healing", { qty: 3, sold: 1 }),
  makeShopItem("bag-of-holding"),
];

function setup() {
  const onSelect = vi.fn();
  render(<ItemList items={items} index={index} generalMod={0} onSelect={onSelect} />);
  return { onSelect, user: userEvent.setup() };
}

describe("ItemList", () => {
  it("agrupa por raridade na ordem certa", () => {
    setup();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Comum",
      "Incomum",
      "Raro",
    ]);
  });

  it("mostra nome em português e em inglês", () => {
    setup();
    const row = screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ });
    expect(row).toHaveTextContent("Bag of Holding");
  });

  it("mostra preço final e preço base riscado quando diferem", () => {
    setup();
    const rare = screen.getByRole("region", { name: "Raro" });
    expect(within(rare).getByText("4.400 PO")).toBeInTheDocument();
    expect(within(rare).getByText("4.000 PO").tagName).toBe("S");
  });

  it("mostra quantidade e vendidos", () => {
    setup();
    const common = screen.getByRole("region", { name: "Comum" });
    expect(within(common).getByText("×3")).toBeInTheDocument();
    expect(within(common).getByText("1 vend.")).toBeInTheDocument();
  });

  it("marca itens que exigem sintonização", () => {
    setup();
    expect(screen.getByTitle("Requer sintonização")).toBeInTheDocument();
  });

  it("filtra por tipo", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "Poção");
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Comum"]);
  });

  it("avisa quando o filtro esvazia a lista", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "Cajado");
    expect(screen.getByText("Nenhum item com esses filtros.")).toBeInTheDocument();
  });

  it("abre o item ao clicar na linha", async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByRole("button", { name: /Anel de Proteção|ring-of-protection/ }));
    expect(onSelect).toHaveBeenCalledWith("ring-of-protection");
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ItemList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { RARITY_LABEL, TYPE_LABEL } from "@/lib/labels";
import { formatGp } from "@/lib/pricing";
import { buildItemGroups, type SortKey } from "@/lib/shopList";
import {
  ITEM_TYPES,
  RARITIES,
  type CatalogItem,
  type ItemType,
  type Rarity,
  type ShopItem,
} from "@/lib/types";
import { RaritySeal } from "./RaritySeal";
import { TypeIcon } from "./TypeIcon";

interface ItemListProps {
  items: readonly ShopItem[];
  index: ReadonlyMap<string, CatalogItem>;
  generalMod: number;
  onSelect: (itemId: string) => void;
}

const SORT_LABEL: Record<SortKey, string> = {
  name: "Nome",
  price_asc: "Preço: menor primeiro",
  price_desc: "Preço: maior primeiro",
};

export function ItemList({ items, index, generalMod, onSelect }: ItemListProps) {
  const [type, setType] = useState<ItemType | "">("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [sort, setSort] = useState<SortKey>("name");
  const groups = buildItemGroups(items, index, generalMod, {
    sort,
    type: type || undefined,
    rarity: rarity || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select className="field" value={type} onChange={(e) => setType(e.target.value as ItemType | "")}>
            <option value="">Todos</option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Raridade
          <select className="field" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "")}>
            <option value="">Todas</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ordenar
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {groups.length === 0 && <p>Nenhum item com esses filtros.</p>}

      {groups.map((group) => (
        <section key={group.rarity} aria-label={RARITY_LABEL[group.rarity]}>
          <h3 className="mb-2">
            <RaritySeal rarity={group.rarity} />
          </h3>
          <table className="old-table w-full">
            <thead>
              <tr>
                <th scope="col" className="text-left">Item</th>
                <th scope="col">Qtd.</th>
                <th scope="col" className="text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(({ shopItem, item, price, base }) => (
                <tr key={item.id}>
                  <td>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left hover:text-blood"
                      onClick={() => onSelect(item.id)}
                    >
                      <TypeIcon type={item.type} className="h-5 w-5 shrink-0" />
                      <span>
                        <span className="block">
                          {item.namePt}
                          {item.attunement && (
                            <abbr title="Requer sintonização" className="ml-1 text-xs text-blood no-underline">
                              (S)
                            </abbr>
                          )}
                        </span>
                        <span className="block text-xs text-ink-soft">{item.nameEn}</span>
                      </span>
                    </button>
                  </td>
                  <td className="numbers text-center">
                    ×{shopItem.qty}
                    {shopItem.sold > 0 && (
                      <span className="block text-xs text-ink-soft">{shopItem.sold} vend.</span>
                    )}
                  </td>
                  <td className="numbers text-right">
                    {formatGp(price)}
                    {base !== null && price !== base && (
                      <s className="block text-xs text-ink-soft">{formatGp(base)}</s>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
```


Run: `npx vitest run src/components/ItemList.test.tsx`
Expected: PASS (8 testes).

**Step 3: Commit**

```bash
git add src/components/ItemList.tsx src/components/ItemList.test.tsx
git commit -m "feat: add grouped item list with filters and sorting"
```

---

### Tarefa 29: Edição de item (`ItemEditor`)

**Files:**
- Create: `src/components/ItemEditor.tsx`
- Create: `src/components/ItemEditor.test.tsx`

**Step 1: Testes que falham**

Os campos numéricos são controlados pelo pai. Nos testes com `vi.fn()` o pai não atualiza, então use `fireEvent.change` para mandar o valor inteiro de uma vez.

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemEditor } from "./ItemEditor";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShopItem } from "@/lib/__fixtures__/shop";
import type { CatalogItem, ShopItem } from "@/lib/types";

const ring = fixtureCatalog.find((i) => i.id === "ring-of-protection")!;
const axe = fixtureCatalog.find((i) => i.id === "axe-of-the-dwarvish-lords")!;

function setup(item: CatalogItem = ring, shopItem: ShopItem = makeShopItem(item.id, { qty: 2 })) {
  const handlers = {
    onQtyChange: vi.fn(),
    onIndividualChange: vi.fn(),
    onOverrideChange: vi.fn(),
    onSoldChange: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
  };
  render(<ItemEditor shopItem={shopItem} item={item} generalMod={0} {...handlers} />);
  return { ...handlers, user: userEvent.setup() };
}

describe("ItemEditor", () => {
  it("tem link para a página do item no AideDD", () => {
    setup();
    const link = screen.getByRole("link", { name: "Ver no AideDD ↗" });
    expect(link).toHaveAttribute("href", ring.url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("altera a quantidade", () => {
    const { onQtyChange } = setup();
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "4" } });
    expect(onQtyChange).toHaveBeenCalledWith(4);
  });

  it("altera o percentual individual", () => {
    const { onIndividualChange } = setup();
    fireEvent.change(screen.getByLabelText("Percentual individual (%)"), { target: { value: "-20" } });
    expect(onIndividualChange).toHaveBeenCalledWith(-20);
  });

  it("define e limpa o preço manual", async () => {
    const { onOverrideChange } = setup(ring, makeShopItem(ring.id, { priceOverride: 900 }));
    fireEvent.change(screen.getByLabelText("Preço manual (PO)"), { target: { value: "750" } });
    expect(onOverrideChange).toHaveBeenLastCalledWith(750);
    fireEvent.change(screen.getByLabelText("Preço manual (PO)"), { target: { value: "" } });
    expect(onOverrideChange).toHaveBeenLastCalledWith(undefined);
  });

  it("marca vendidos com + e −", async () => {
    const { onSoldChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Aumentar vendidos" }));
    await user.click(screen.getByRole("button", { name: "Diminuir vendidos" }));
    expect(onSoldChange.mock.calls).toEqual([[1], [-1]]);
  });

  it("remove o item", async () => {
    const { onRemove, user } = setup();
    await user.click(screen.getByRole("button", { name: "Remover item" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("artefato sem preço manual mostra travessão e bloqueia percentual", () => {
    setup(axe, makeShopItem(axe.id));
    expect(screen.getByText("Preço: —")).toBeInTheDocument();
    expect(screen.getByLabelText("Percentual individual (%)")).toBeDisabled();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ItemEditor.tsx`:

```tsx
"use client";

import { TYPE_LABEL } from "@/lib/labels";
import { basePrice, finalPrice, formatGp } from "@/lib/pricing";
import type { CatalogItem, ShopItem } from "@/lib/types";
import { NumberField } from "./fields";
import { Modal } from "./Modal";
import { RaritySeal } from "./RaritySeal";
import { TypeIcon } from "./TypeIcon";

interface ItemEditorProps {
  shopItem: ShopItem;
  item: CatalogItem;
  generalMod: number;
  onQtyChange: (qty: number) => void;
  onIndividualChange: (percent: number) => void;
  onOverrideChange: (value: number | undefined) => void;
  onSoldChange: (delta: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function ItemEditor({
  shopItem,
  item,
  generalMod,
  onQtyChange,
  onIndividualChange,
  onOverrideChange,
  onSoldChange,
  onRemove,
  onClose,
}: ItemEditorProps) {
  const isArtifact = item.rarity === "artifact";
  const price = finalPrice(item, shopItem, generalMod);
  const base = basePrice(item);

  return (
    <Modal title={item.namePt} onClose={onClose}>
      <p className="-mt-3 mb-3 text-sm text-ink-soft">{item.nameEn}</p>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <RaritySeal rarity={item.rarity} />
        <span className="flex items-center gap-1">
          <TypeIcon type={item.type} className="h-4 w-4" />
          {TYPE_LABEL[item.type]}
        </span>
        {item.attunement && <span>Requer sintonização</span>}
      </div>

      <p className="numbers mb-4 text-lg">
        {`Preço: ${formatGp(price)}`}
        {base !== null && price !== base && (
          <s className="ml-2 text-sm text-ink-soft">{formatGp(base)}</s>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Quantidade"
          value={shopItem.qty}
          min={1}
          onChange={(value) => {
            if (!Number.isNaN(value)) onQtyChange(value);
          }}
        />
        <NumberField
          label="Percentual individual (%)"
          value={shopItem.priceMods.individual}
          disabled={isArtifact}
          onChange={(value) => {
            if (!Number.isNaN(value)) onIndividualChange(value);
          }}
        />
        <div className="col-span-2">
          <NumberField
            label="Preço manual (PO)"
            value={shopItem.priceOverride ?? Number.NaN}
            min={0}
            placeholder="automático"
            onChange={(value) => onOverrideChange(Number.isNaN(value) ? undefined : value)}
          />
        </div>
      </div>

      {isArtifact && (
        <p className="mt-2 text-sm text-ink-soft">
          Artefatos não têm preço base. Defina o preço manualmente; percentuais não se aplicam.
        </p>
      )}
      {shopItem.priceOverride !== undefined && (
        <button type="button" className="mt-2 text-sm underline" onClick={() => onOverrideChange(undefined)}>
          Usar preço automático
        </button>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span>Vendidos</span>
        <button type="button" className="btn" aria-label="Diminuir vendidos" onClick={() => onSoldChange(-1)}>
          −
        </button>
        <span className="numbers">{`${shopItem.sold} / ${shopItem.qty}`}</span>
        <button type="button" className="btn" aria-label="Aumentar vendidos" onClick={() => onSoldChange(1)}>
          +
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
          Ver no AideDD ↗
        </a>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={onRemove}>
            Remover item
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

Run: `npx vitest run src/components/ItemEditor.test.tsx`
Expected: PASS (7 testes).

**Step 3: Commit**

```bash
git add src/components/ItemEditor.tsx src/components/ItemEditor.test.tsx
git commit -m "feat: add item editor dialog"
```

---

### Tarefa 30: Busca no catálogo para "+ Manual" (`CatalogPicker`)

**Files:**
- Create: `src/components/CatalogPicker.tsx`
- Create: `src/components/CatalogPicker.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogPicker } from "./CatalogPicker";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";

function setup() {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(<CatalogPicker catalog={fixtureCatalog} onPick={onPick} onClose={onClose} />);
  return { onPick, onClose, user: userEvent.setup() };
}

describe("CatalogPicker", () => {
  it("busca em português sem acento", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Buscar no catálogo" }), "bolsa");
    expect(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 item");
  });

  it("filtra por raridade", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Raridade"), "Raro");
    expect(screen.getByRole("status")).toHaveTextContent("2 itens");
  });

  it("adiciona o item escolhido e confirma na tela", async () => {
    const { onPick, user } = setup();
    await user.click(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" }));
    expect(onPick).toHaveBeenCalledWith("bag-of-holding");
    expect(screen.getByRole("status")).toHaveTextContent("Adicionado: Bolsa Guarda-Tudo");
  });

  it("fecha em Concluir", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/CatalogPicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { searchCatalog } from "@/lib/catalog";
import { RARITY_LABEL, TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES, RARITIES, type CatalogItem, type ItemType, type Rarity } from "@/lib/types";
import { Modal } from "./Modal";
import { RaritySeal } from "./RaritySeal";

const MAX_RESULTS = 50;

interface CatalogPickerProps {
  catalog: readonly CatalogItem[];
  onPick: (itemId: string) => void;
  onClose: () => void;
}

const countLabel = (n: number) => `${n} ${n === 1 ? "item" : "itens"}`;

export function CatalogPicker({ catalog, onPick, onClose }: CatalogPickerProps) {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [type, setType] = useState<ItemType | "">("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const results = searchCatalog(catalog, query, {
    rarities: rarity ? [rarity] : [],
    types: type ? [type] : [],
  });
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <Modal title="Adicionar item" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          className="field"
          aria-label="Buscar no catálogo"
          placeholder="Nome em português ou inglês"
          value={query}
          autoFocus
          onChange={(event) => {
            setQuery(event.target.value);
            setLastAdded(null);
          }}
        />
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Raridade
            <select className="field" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "")}>
              <option value="">Todas</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {RARITY_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Tipo
            <select className="field" value={type} onChange={(e) => setType(e.target.value as ItemType | "")}>
              <option value="">Todos</option>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p role="status" className="text-sm text-ink-soft">
          {lastAdded ? `Adicionado: ${lastAdded}` : countLabel(results.length)}
        </p>
        <ul className="max-h-[45dvh] overflow-y-auto">
          {shown.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 border-b border-rule py-1">
              <span className="flex items-center gap-2">
                <RaritySeal rarity={item.rarity} short />
                <span>
                  {item.namePt} <span className="text-xs text-ink-soft">{item.nameEn}</span>
                </span>
              </span>
              <button
                type="button"
                className="btn"
                aria-label={`Adicionar ${item.namePt}`}
                onClick={() => {
                  onPick(item.id);
                  setLastAdded(item.namePt);
                }}
              >
                +
              </button>
            </li>
          ))}
        </ul>
        {results.length > shown.length && (
          <p className="text-sm text-ink-soft">
            Mostrando {shown.length} de {results.length}. Refine a busca.
          </p>
        )}
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

Run: PASS (4 testes).

**Step 3: Commit**

```bash
git add src/components/CatalogPicker.tsx src/components/CatalogPicker.test.tsx
git commit -m "feat: add catalog picker for manual item add"
```

---

### Tarefa 31: Aba "Itens" (`ItemsPanel`)

Liga formulário, lista, editor e busca. Toda mudança sai por `onChange(shop)`.

**Files:**
- Create: `src/components/ItemsPanel.tsx`
- Create: `src/components/ItemsPanel.test.tsx`

**Step 1: Testes que falham**

O harness guarda a loja em estado, como o provider faria.

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ItemsPanel } from "./ItemsPanel";
import { indexCatalog } from "@/lib/catalog";
import { mulberry32 } from "@/lib/random";
import type { Shop } from "@/lib/types";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop, makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
let latest: Shop;

function Harness({ initial }: { initial: Shop }) {
  const [shop, setShop] = useState(initial);
  latest = shop;
  return (
    <ItemsPanel shop={shop} catalog={fixtureCatalog} index={index} rng={mulberry32(1)} onChange={setShop} />
  );
}

function setup(initial: Shop = makeShop()) {
  render(<Harness initial={initial} />);
  return userEvent.setup();
}

describe("ItemsPanel", () => {
  it("loja vazia mostra o formulário de geração", () => {
    setup();
    expect(screen.getByRole("button", { name: "Gerar itens" })).toBeInTheDocument();
  });

  it("gera itens, mostra a lista e guarda a configuração", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("region", { name: "Comum" })).toBeInTheDocument();
    expect(latest.items).toHaveLength(10);
    expect(latest.lastConfig?.rarityCounts.common).toBe(4);
  });

  it("avisa quando faltam itens para a raridade pedida", async () => {
    const user = setup();
    await user.clear(screen.getByLabelText("Raro"));
    await user.type(screen.getByLabelText("Raro"), "5");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("status")).toHaveTextContent("Só 2 de 5 Raro disponíveis com esses filtros.");
  });

  it("+ Manual acrescenta o item escolhido", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1")] }));
    await user.click(screen.getByRole("button", { name: "+ Manual" }));
    await user.click(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ })).toBeInTheDocument();
  });

  it("+ Aleatório acrescenta sem apagar os itens atuais", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1")] }));
    await user.click(screen.getByRole("button", { name: "+ Aleatório" }));
    await user.click(screen.getByRole("button", { name: "Acrescentar itens" }));
    expect(latest.items[0].itemId).toBe("armor-plus-1");
    expect(latest.items.length).toBeGreaterThan(1);
    expect(latest.items.filter((i) => i.itemId === "armor-plus-1")).toHaveLength(1);
  });

  it("Regerar tudo pede confirmação antes de trocar a lista", async () => {
    const user = setup(makeShop({ items: [makeShopItem("legendary-weapon")] }));
    await user.click(screen.getByRole("button", { name: "Regerar tudo" }));
    expect(latest.items.map((i) => i.itemId)).toEqual(["legendary-weapon"]);
    await user.click(screen.getByRole("button", { name: "Regerar" }));
    expect(latest.items.map((i) => i.itemId)).not.toContain("legendary-weapon");
  });

  it("abre o editor pela linha e remove o item", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1"), makeShopItem("bag-of-holding")] }));
    await user.click(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ }));
    const dialog = screen.getByRole("dialog", { name: "Bolsa Guarda-Tudo" });
    await user.click(within(dialog).getByRole("button", { name: "Remover item" }));
    expect(latest.items.map((i) => i.itemId)).toEqual(["armor-plus-1"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marca vendido pelo editor", async () => {
    const user = setup(makeShop({ items: [makeShopItem("bag-of-holding", { qty: 2 })] }));
    await user.click(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ }));
    await user.click(screen.getByRole("button", { name: "Aumentar vendidos" }));
    expect(latest.items[0].sold).toBe(1);
  });
});
```

Conta de conferência: a configuração padrão pede 4 C, 3 U, 2 R, 1 VR = 10 itens; o fixture tem 4, 4, 2 e 1 itens nessas raridades.

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ItemsPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { defaultGenConfig } from "@/lib/config";
import { describeShortfalls, generateItems } from "@/lib/generator";
import type { Rng } from "@/lib/random";
import {
  addManualItem,
  changeSold,
  generalModOf,
  removeShopItem,
  setIndividualMod,
  setPriceOverride,
  setQty,
} from "@/lib/shop";
import type { CatalogItem, GenConfig, Shop, ShopItem } from "@/lib/types";
import { CatalogPicker } from "./CatalogPicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { GeneratorForm } from "./GeneratorForm";
import { ItemEditor } from "./ItemEditor";
import { ItemList } from "./ItemList";

type Mode = "list" | "random" | "manual" | "confirm-regen";

interface ItemsPanelProps {
  shop: Shop;
  catalog: readonly CatalogItem[];
  index: ReadonlyMap<string, CatalogItem>;
  rng: Rng;
  onChange: (shop: Shop) => void;
}

export function ItemsPanel({ shop, catalog, index, rng, onChange }: ItemsPanelProps) {
  const [mode, setMode] = useState<Mode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const generalMod = generalModOf(shop);
  const baseConfig = shop.lastConfig ?? defaultGenConfig();
  const setItems = (items: ShopItem[]) => onChange({ ...shop, items });

  function generate(config: GenConfig, existing: readonly ShopItem[]) {
    const result = generateItems({ catalog, config, existing, rng });
    onChange({ ...shop, items: result.items, lastConfig: config });
    setWarnings(describeShortfalls(result.shortfalls));
    setMode("list");
  }

  const selected = selectedId ? shop.items.find((i) => i.itemId === selectedId) : undefined;
  const selectedItem = selected ? index.get(selected.itemId) : undefined;

  const warningList = warnings.length > 0 && (
    <ul role="status" className="frame p-3 text-sm">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );

  if (shop.items.length === 0 && mode === "list") {
    return (
      <div className="flex flex-col gap-4">
        {warningList}
        <GeneratorForm initial={baseConfig} submitLabel="Gerar itens" onSubmit={(c) => generate(c, [])} />
        <button type="button" className="btn self-start" onClick={() => setMode("manual")}>
          Adicionar manualmente
        </button>
        {/* O modo manual cai no ramo de baixo, que abre o CatalogPicker. */}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => setMode("random")}>
          + Aleatório
        </button>
        <button type="button" className="btn" onClick={() => setMode("manual")}>
          + Manual
        </button>
        <button type="button" className="btn" onClick={() => setMode("confirm-regen")}>
          Regerar tudo
        </button>
      </div>

      {warningList}

      {mode === "random" ? (
        <GeneratorForm
          initial={baseConfig}
          submitLabel="Acrescentar itens"
          onSubmit={(c) => generate(c, shop.items)}
          onCancel={() => setMode("list")}
        />
      ) : (
        <ItemList items={shop.items} index={index} generalMod={generalMod} onSelect={setSelectedId} />
      )}

      {mode === "manual" && (
        <CatalogPicker
          catalog={catalog}
          onPick={(itemId) => setItems(addManualItem(shop.items, itemId))}
          onClose={() => setMode("list")}
        />
      )}

      {mode === "confirm-regen" && (
        <ConfirmDialog
          title="Regerar tudo"
          message="Todos os itens atuais serão substituídos por um novo sorteio com a última configuração."
          confirmLabel="Regerar"
          onConfirm={() => generate(baseConfig, [])}
          onCancel={() => setMode("list")}
        />
      )}

      {selected && selectedItem && (
        <ItemEditor
          shopItem={selected}
          item={selectedItem}
          generalMod={generalMod}
          onQtyChange={(qty) => setItems(setQty(shop.items, selected.itemId, qty))}
          onIndividualChange={(p) => setItems(setIndividualMod(shop.items, selected.itemId, p))}
          onOverrideChange={(v) => setItems(setPriceOverride(shop.items, selected.itemId, v))}
          onSoldChange={(d) => setItems(changeSold(shop.items, selected.itemId, d))}
          onRemove={() => {
            setItems(removeShopItem(shop.items, selected.itemId));
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
```

Run: `npx vitest run src/components/ItemsPanel.test.tsx`
Expected: PASS (8 testes).

**Step 3: Commit**

```bash
git add src/components/ItemsPanel.tsx src/components/ItemsPanel.test.tsx
git commit -m "feat: add items tab with generate, add, regenerate and edit"
```

---

### Tarefa 32: Aba "Informações" (`ShopInfoForm`)

**Files:**
- Create: `src/components/ShopInfoForm.tsx`
- Create: `src/components/ShopInfoForm.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ShopInfoForm } from "./ShopInfoForm";
import type { Shop } from "@/lib/types";
import { makeShop } from "@/lib/__fixtures__/shop";

let latest: Shop;

function Harness() {
  const [shop, setShop] = useState(makeShop({ location: "" }));
  latest = shop;
  return <ShopInfoForm shop={shop} onChange={setShop} />;
}

describe("ShopInfoForm", () => {
  it("edita local, tipo, descrição e anotações", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Local"), "Baldur's Gate");
    await user.clear(screen.getByLabelText("Tipo de loja"));
    await user.type(screen.getByLabelText("Tipo de loja"), "Penhor");
    await user.type(screen.getByLabelText("Descrição"), "Cheira a incenso.");
    await user.type(screen.getByLabelText("Anotações do mestre"), "O dono é um doppelganger.");
    expect(latest).toMatchObject({
      location: "Baldur's Gate",
      kind: "Penhor",
      description: "Cheira a incenso.",
      notes: "O dono é um doppelganger.",
    });
  });

  it("edita o nome", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Nova");
    expect(latest.name).toBe("Nova");
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ShopInfoForm.tsx`:

```tsx
import type { Shop } from "@/lib/types";
import { TextAreaField, TextField } from "./fields";

interface ShopInfoFormProps {
  shop: Shop;
  onChange: (shop: Shop) => void;
}

export function ShopInfoForm({ shop, onChange }: ShopInfoFormProps) {
  const set = (patch: Partial<Shop>) => onChange({ ...shop, ...patch });
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <TextField label="Nome" value={shop.name} onChange={(name) => set({ name })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Local" value={shop.location} onChange={(location) => set({ location })} />
        <TextField label="Tipo de loja" value={shop.kind} onChange={(kind) => set({ kind })} />
      </div>
      <TextAreaField label="Descrição" value={shop.description} onChange={(description) => set({ description })} />
      <TextAreaField label="Anotações do mestre" rows={6} value={shop.notes} onChange={(notes) => set({ notes })} />
      <p className="text-sm text-ink-soft">Salvo automaticamente.</p>
    </form>
  );
}
```

Run: PASS (2 testes).

**Step 3: Commit**

```bash
git add src/components/ShopInfoForm.tsx src/components/ShopInfoForm.test.tsx
git commit -m "feat: add shop info tab"
```

---

### Tarefa 33: Aba "NPCs" (`NpcList`)

**Files:**
- Create: `src/components/NpcList.tsx`
- Create: `src/components/NpcList.test.tsx`

**Step 1: Testes que falham**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NpcList } from "./NpcList";
import type { Npc } from "@/lib/types";
import { makeDeps } from "@/lib/__fixtures__/deps";

let latest: Npc[];

function Harness({ initial = [] }: { initial?: Npc[] }) {
  const [npcs, setNpcs] = useState(initial);
  const [deps] = useState(() => makeDeps());
  latest = npcs;
  return <NpcList npcs={npcs} deps={deps} onChange={setNpcs} />;
}

describe("NpcList", () => {
  it("mostra aviso quando não há NPCs", () => {
    render(<Harness />);
    expect(screen.getByText("Nenhum NPC ainda.")).toBeInTheDocument();
  });

  it("adiciona e edita um NPC", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Adicionar NPC" }));
    const card = screen.getByRole("group", { name: "NPC sem nome" });
    await user.type(within(card).getByLabelText("Nome"), "Brom");
    await user.type(within(screen.getByRole("group", { name: "Brom" })).getByLabelText("Papel"), "Dono");
    expect(latest).toEqual([{ id: "id-1", name: "Brom", role: "Dono", description: "" }]);
  });

  it("remove um NPC", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "a", name: "Lia", role: "", description: "" }]} />);
    await user.click(screen.getByRole("button", { name: "Remover Lia" }));
    expect(latest).toEqual([]);
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/NpcList.tsx`:

```tsx
import { addNpc, removeNpc, updateNpc } from "@/lib/shop";
import type { IdSource, Npc } from "@/lib/types";
import { TextAreaField, TextField } from "./fields";

interface NpcListProps {
  npcs: Npc[];
  deps: IdSource;
  onChange: (npcs: Npc[]) => void;
}

export function NpcList({ npcs, deps, onChange }: NpcListProps) {
  return (
    <div className="flex flex-col gap-4">
      {npcs.length === 0 && <p>Nenhum NPC ainda.</p>}
      {npcs.map((npc) => (
        <fieldset key={npc.id} className="frame flex flex-col gap-2 p-4">
          <legend className="title px-1 text-lg">{npc.name || "NPC sem nome"}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Nome" value={npc.name} onChange={(name) => onChange(updateNpc(npcs, npc.id, { name }))} />
            <TextField
              label="Papel"
              value={npc.role}
              placeholder="Dono, aprendiz, guarda…"
              onChange={(role) => onChange(updateNpc(npcs, npc.id, { role }))}
            />
          </div>
          <TextAreaField
            label="Descrição"
            value={npc.description}
            onChange={(description) => onChange(updateNpc(npcs, npc.id, { description }))}
          />
          <button type="button" className="self-end text-sm text-blood underline" onClick={() => onChange(removeNpc(npcs, npc.id))}>
            {`Remover ${npc.name || "NPC"}`}
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn self-start" onClick={() => onChange(addNpc(npcs, deps))}>
        Adicionar NPC
      </button>
    </div>
  );
}
```

Run: PASS (3 testes).

**Step 3: Commit**

```bash
git add src/components/NpcList.tsx src/components/NpcList.test.tsx
git commit -m "feat: add NPC tab"
```

---

### Tarefa 34: Página da loja (`ShopView` e `/loja/[id]`)

**Files:**
- Create: `src/components/ShopView.tsx`
- Create: `src/components/ShopView.test.tsx`
- Create: `src/app/loja/[id]/page.tsx`

**Step 1: Testes que falham**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShopView } from "./ShopView";
import { loadShops } from "@/lib/storage";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shop = makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar", kind: "Ferreiro" });

function setup(shopId = "a") {
  const result = renderWithShops(<ShopView shopId={shopId} catalog={fixtureCatalog} />, { shops: [shop] });
  return { ...result, user: userEvent.setup() };
}

describe("ShopView", () => {
  it("mostra 'Loja não encontrada' com link de volta", () => {
    setup("nao-existe");
    expect(screen.getByRole("heading", { name: "Loja não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar às lojas" })).toHaveAttribute("href", "/");
  });

  it("mostra nome, local e tipo da loja", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Forja Rúnica" })).toBeInTheDocument();
    expect(screen.getByText("Mirabar · Ferreiro")).toBeInTheDocument();
  });

  it("abre na aba Itens", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Itens" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Gerar itens" })).toBeInTheDocument();
  });

  it("troca para a aba NPCs", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "NPCs" }));
    expect(screen.getByRole("tab", { name: "NPCs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Adicionar NPC" })).toBeInTheDocument();
  });

  it("editar o nome em Informações atualiza o título", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "Informações" }));
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Nova Forja");
    expect(screen.getByRole("heading", { level: 1, name: "Nova Forja" })).toBeInTheDocument();
  });

  it("gerar itens grava a loja", async () => {
    const { user, storage } = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("region", { name: "Comum" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const saved = loadShops(storage);
    expect(saved.ok && saved.value[0].items).toHaveLength(10);
  });
});
```

Run: FAIL por import.

**Step 2: Implementar**

`src/components/ShopView.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { indexCatalog } from "@/lib/catalog";
import type { CatalogItem } from "@/lib/types";
import { ItemsPanel } from "./ItemsPanel";
import { NpcList } from "./NpcList";
import { ShopInfoForm } from "./ShopInfoForm";
import { useShops } from "./ShopsProvider";

const TABS = [
  { id: "items", label: "Itens" },
  { id: "info", label: "Informações" },
  { id: "npcs", label: "NPCs" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface ShopViewProps {
  shopId: string;
  catalog: readonly CatalogItem[];
}

export function ShopView({ shopId, catalog }: ShopViewProps) {
  const { shops, loaded, deps, upsertShop } = useShops();
  const index = useMemo(() => indexCatalog(catalog), [catalog]);
  const [tab, setTab] = useState<TabId>("items");

  if (!loaded) return <p>Carregando…</p>;

  const shop = shops.find((s) => s.id === shopId);
  if (!shop) {
    return (
      <div className="frame p-6 text-center">
        <h1 className="title mb-3 text-2xl">Loja não encontrada</h1>
        <Link href="/" className="underline">
          Voltar às lojas
        </Link>
      </div>
    );
  }

  const subtitle = [shop.location, shop.kind].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-4">
      <Link href="/" className="text-sm text-ink-soft hover:text-blood">
        ← Lojas
      </Link>
      <header>
        <h1 className="title drop-cap text-3xl">{shop.name || "Loja sem nome"}</h1>
        {subtitle && <p className="text-ink-soft">{subtitle}</p>}
      </header>

      <div role="tablist" aria-label="Seções da loja" className="flex gap-1 border-b-2 border-blood">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`title px-4 py-2 ${tab === t.id ? "bg-blood text-parchment" : "hover:bg-parchment-deep"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "items" && (
          <ItemsPanel shop={shop} catalog={catalog} index={index} rng={deps.rng} onChange={upsertShop} />
        )}
        {tab === "info" && <ShopInfoForm shop={shop} onChange={upsertShop} />}
        {tab === "npcs" && (
          <NpcList npcs={shop.npcs} deps={deps} onChange={(npcs) => upsertShop({ ...shop, npcs })} />
        )}
      </div>
    </article>
  );
}
```

`src/app/loja/[id]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import { CATALOG } from "@/lib/catalogData";

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  return <ShopView shopId={id} catalog={CATALOG} />;
}
```

Run: `npx vitest run src/components/ShopView.test.tsx`
Expected: PASS (6 testes).

**Step 3: Commit**

```bash
git add src/components/ShopView.tsx src/components/ShopView.test.tsx "src/app/loja/[id]/page.tsx"
git commit -m "feat: add shop page with items, info and NPC tabs"
```

---

### Tarefa 35: Configurações (`SettingsView` e `/configuracoes`)

**Files:**
- Create: `src/components/download.ts`
- Create: `src/components/readFileText.ts`
- Create: `src/components/SettingsView.tsx`
- Create: `src/components/SettingsView.test.tsx`
- Create: `src/app/configuracoes/page.tsx`

**Step 1: Utilitários do navegador**

Estes dois arquivos só fazem ponte com APIs do navegador. `downloadFile` é substituída por um `vi.fn()` nos testes; `readFileText` é exercitada pelos testes de importação.

`src/components/download.ts`:

```ts
export function downloadFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
```

`src/components/readFileText.ts`:

```ts
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
```

**Step 2: Testes que falham**

`src/components/SettingsView.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsView } from "./SettingsView";
import { createSnapshot, exportBackup, loadShops, parseBackup } from "@/lib/storage";
import { makeDeps } from "@/lib/__fixtures__/deps";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shopA = makeShop({ id: "a", name: "Loja A" });
const shopB = makeShop({ id: "b", name: "Loja B" });

const savedNames = (storage: Storage) => {
  const result = loadShops(storage);
  return result.ok ? result.value.map((s) => s.name) : result.error;
};

const jsonFile = (content: string) => new File([content], "backup.json", { type: "application/json" });

describe("SettingsView", () => {
  it("exporta backup com as lojas atuais", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    renderWithShops(<SettingsView onDownload={onDownload} />, { shops: [shopA] });
    await user.click(screen.getByRole("button", { name: "Exportar backup" }));
    const [fileName, content] = onDownload.mock.calls[0];
    expect(fileName).toBe("lojinha-backup-2026-09-22.json");
    expect(parseBackup(content)).toMatchObject({ ok: true, value: { shops: [shopA] } });
  });

  it("rejeita JSON inválido sem mexer nos dados", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile("{lixo"));
    expect(await screen.findByText("O arquivo não é um JSON válido. Nada foi alterado.")).toBeInTheDocument();
    expect(savedNames(storage)).toEqual(["Loja A"]);
  });

  it("mostra prévia e substitui as lojas ao confirmar", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile(exportBackup([shopB], makeDeps())));
    expect(await screen.findByText(/Backup com 1 loja\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Substituir tudo" }));
    expect(await screen.findByText(/Agora há 1 loja/)).toBeInTheDocument();
    expect(savedNames(storage)).toEqual(["Loja B"]);
  });

  it("mescla as lojas importadas com as atuais", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile(exportBackup([shopB], makeDeps())));
    await user.click(await screen.findByRole("button", { name: "Mesclar" }));
    expect(savedNames(storage)).toEqual(["Loja A", "Loja B"]);
  });

  it("lista snapshots e restaura depois de confirmar", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    createSnapshot(storage, [shopB], { now: () => new Date("2026-09-20T10:00:00Z"), newId: () => "antigo" });
    renderWithShops(<SettingsView />, { shops: [shopA], storage });
    expect(screen.getByText(/1 loja$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Restaurar snapshot/ }));
    await user.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(savedNames(storage)).toEqual(["Loja B"]);
    expect(screen.getByRole("status")).toHaveTextContent("Snapshot restaurado");
  });
});
```

Run: FAIL por import.

**Step 3: Implementar**

`src/components/SettingsView.tsx`:

```tsx
"use client";

import { useState, type ChangeEvent } from "react";
import {
  backupFileName,
  exportBackup,
  importBackup,
  listSnapshots,
  parseBackup,
  restoreSnapshot,
  type ImportMode,
  type ParseError,
  type StorageError,
} from "@/lib/storage";
import { ConfirmDialog } from "./ConfirmDialog";
import { downloadFile } from "./download";
import { readFileText } from "./readFileText";
import { useShops } from "./ShopsProvider";

const ERROR_MESSAGES: Record<ParseError | StorageError | "not_found", string> = {
  invalid_json: "O arquivo não é um JSON válido. Nada foi alterado.",
  unknown_schema: "Versão de backup desconhecida. Nada foi alterado.",
  invalid_shape: "O arquivo não tem o formato de backup da Lojinha. Nada foi alterado.",
  unavailable: "O armazenamento do navegador está indisponível.",
  quota: "O armazenamento do navegador está cheio.",
  corrupt: "Os dados salvos estão corrompidos.",
  not_found: "Snapshot não encontrado.",
};

const shopCount = (n: number) => `${n} ${n === 1 ? "loja" : "lojas"}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

interface SettingsViewProps {
  onDownload?: (fileName: string, content: string) => void;
}

export function SettingsView({ onDownload = downloadFile }: SettingsViewProps) {
  const { shops, storage, deps, loaded, replaceAll } = useShops();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ json: string; count: number } | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [, refresh] = useState(0);

  if (!loaded) return <p>Carregando…</p>;
  const snapshots = storage ? listSnapshots(storage) : [];

  function handleExport() {
    onDownload(backupFileName(deps), exportBackup(shops, deps));
    setMessage(`Backup exportado com ${shopCount(shops.length)}.`);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const json = await readFileText(file);
    input.value = "";
    const parsed = parseBackup(json);
    if (!parsed.ok) {
      setPending(null);
      setMessage(ERROR_MESSAGES[parsed.error]);
      return;
    }
    setMessage(null);
    setPending({ json, count: parsed.value.shops.length });
  }

  function handleImport(mode: ImportMode) {
    if (!storage || !pending) return;
    const result = importBackup(storage, shops, pending.json, mode, deps);
    setPending(null);
    if (!result.ok) {
      setMessage(ERROR_MESSAGES[result.error]);
      return;
    }
    replaceAll(result.value);
    setMessage(`Backup importado. Agora há ${shopCount(result.value.length)}.`);
    refresh((n) => n + 1);
  }

  function handleRestore() {
    if (!storage || !restoreId) return;
    const result = restoreSnapshot(storage, shops, restoreId, deps);
    setRestoreId(null);
    if (!result.ok) {
      setMessage(ERROR_MESSAGES[result.error]);
      return;
    }
    replaceAll(result.value);
    setMessage("Snapshot restaurado. O estado anterior foi guardado como um snapshot novo.");
    refresh((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="title text-3xl">Configurações</h1>
      {message && (
        <p role="status" className="frame p-3">
          {message}
        </p>
      )}

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Exportar</h2>
        <p className="mb-3 text-sm">Baixa um arquivo .json com todas as lojas.</p>
        <button type="button" className="btn btn-primary" onClick={handleExport}>
          Exportar backup
        </button>
      </section>

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Importar</h2>
        {storage ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm">Arquivo de backup</span>
            <input type="file" accept="application/json,.json" onChange={handleFile} />
          </label>
        ) : (
          <p className="text-sm">Armazenamento do navegador indisponível.</p>
        )}
        {pending && (
          <div className="mt-3 flex flex-col gap-2">
            <p>
              Backup com {shopCount(pending.count)}. Antes de importar, um snapshot do estado atual será
              criado.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => handleImport("replace")}>
                Substituir tudo
              </button>
              <button type="button" className="btn" onClick={() => handleImport("merge")}>
                Mesclar
              </button>
              <button type="button" className="btn" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Snapshots</h2>
        <p className="mb-3 text-sm">
          Até 10 cópias automáticas, a mais recente primeiro. Uma nova cópia é criada no máximo a cada 5
          minutos de edição e sempre antes de importar ou restaurar.
        </p>
        {snapshots.length === 0 ? (
          <p>Nenhum snapshot ainda.</p>
        ) : (
          <ul>
            {snapshots.map((snapshot) => (
              <li key={snapshot.id} className="flex items-center justify-between gap-2 border-b border-rule py-2">
                <span className="numbers">{`${formatDate(snapshot.createdAt)} — ${shopCount(snapshot.shops.length)}`}</span>
                <button
                  type="button"
                  className="btn"
                  aria-label={`Restaurar snapshot de ${formatDate(snapshot.createdAt)}`}
                  onClick={() => setRestoreId(snapshot.id)}
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {restoreId && (
        <ConfirmDialog
          title="Restaurar snapshot"
          message="As lojas atuais serão substituídas por este snapshot. Antes disso, o estado atual vira um snapshot novo."
          confirmLabel="Restaurar"
          onConfirm={handleRestore}
          onCancel={() => setRestoreId(null)}
        />
      )}
    </div>
  );
}
```

`src/app/configuracoes/page.tsx`:

```tsx
import { SettingsView } from "@/components/SettingsView";

export default function SettingsPage() {
  return <SettingsView />;
}
```

Run: `npx vitest run src/components/SettingsView.test.tsx`
Expected: PASS (5 testes).

**Step 4: Commit**

```bash
git add src/components/download.ts src/components/readFileText.ts src/components/SettingsView.tsx src/components/SettingsView.test.tsx src/app/configuracoes/page.tsx
git commit -m "feat: add settings page with export, import and snapshot restore"
```

---

### Tarefa 36: Acabamento visual

Sem teste automatizado. Verificação no navegador.

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Cantos ornamentados dos cards**

Acrescente dentro de `@layer components`:

```css
  .corners {
    --corner: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none' stroke='%23a8833a' stroke-width='1.2'><path d='M1 17V7a6 6 0 0 1 6-6h10'/><path d='M4 17V9a5 5 0 0 1 5-5h8'/><circle cx='9' cy='9' r='1.3' fill='%23a8833a'/></svg>");
    background-image: var(--corner), var(--corner), var(--corner), var(--corner);
    background-repeat: no-repeat;
    background-position:
      top 3px left 3px,
      top 3px right 3px,
      bottom 3px left 3px,
      bottom 3px right 3px;
  }
```

Os quatro cantos usam o mesmo desenho, sem rotação. Se quiser cantos espelhados, crie quatro URLs com `transform='scale(-1 1)'` e ajuste; não é obrigatório.

**Step 2: Verificação manual**

```bash
npm run dev
```

No navegador, em largura de celular (375 px) e de desktop (1280 px), confira:

1. `/`: título, busca, "Nova loja", grade de 1 coluna no celular, 2 no tablet e 3–4 no desktop. Card com moldura dupla, cantos, capitular, chips `C · U · R`.
2. Criar loja → abre `/loja/<id>` com o formulário. Gerar → lista agrupada por raridade, ícones, selo de sintonização, preço com base riscada.
3. Tocar num item → editor. Mudar quantidade, percentual, preço manual, vendido. "Ver no AideDD ↗" abre a página certa em outra aba.
4. `+ Aleatório`, `+ Manual`, `Regerar tudo` (com confirmação), filtros e ordenação.
5. Abas Informações e NPCs. Recarregar a página: tudo continua lá.
6. `/configuracoes`: exportar, importar (substituir e mesclar), restaurar snapshot.
7. `/loja/nao-existe`: "Loja não encontrada".
8. Modo escuro do sistema: fundo marrom, texto creme, selos legíveis.
9. Contraste AA: use a ferramenta de acessibilidade do DevTools nos textos `text-ink-soft`, nos selos e nos botões. Se algum ficar abaixo de 4,5:1, escureça (modo claro) ou clareie (modo escuro) a variável em `:root`.
10. Sem rolagem horizontal em 375 px.

Anote o que foi conferido e o que precisou de ajuste.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add card corner ornaments and visual polish"
```

---

### Tarefa 37: Verificação final e publicação

**Step 1: Verificação completa**

```bash
npm run test:run
npm run typecheck
npm run lint
npm run catalog:validate
npm run build
```

Expected: tudo verde. Informe ao usuário a saída real de cada comando, inclusive a contagem de testes.

**Step 2: Revisão de código**

Use a skill `superpowers:requesting-code-review` comparando a implementação com este plano e com o design.

**Step 3: Publicar (pedir autorização antes)**

Pergunte ao usuário antes de cada passo abaixo:

1. `git push -u origin main` para `https://github.com/ottovarga/loja-itens-magicos-dnd2024`.
2. Na Vercel, o usuário importa o repositório (framework Next.js detectado; sem variáveis de ambiente).
3. Depois do deploy, repita a verificação manual da Tarefa 36 na URL publicada.
