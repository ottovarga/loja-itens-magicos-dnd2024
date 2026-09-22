# Loja de Itens Mágicos D&D 2024 — Design

**Data:** 2026-09-22
**Repositório:** https://github.com/ottovarga/loja-itens-magicos-dnd2024
**Status:** aprovado

## Objetivo

Ferramenta web para o mestre de D&D 5.5 (regras 2024) criar lojas de itens mágicos com itens reais do jogo, sorteados aleatoriamente segundo parâmetros definidos pelo mestre. Cada loja aparece como um card; ao abrir, o mestre gera ou vê a lista de itens, edita a lista (manual ou aleatoriamente) e registra informações da loja (local, NPCs, anotações).

## Decisões

| Tema | Decisão |
|---|---|
| Fonte dos itens | Lista do AideDD (https://www.aidedd.org/magic-item/), ~400 itens do DMG 2024 |
| Conteúdo do catálogo | Nome, tipo, raridade, sintonização, fonte e link para a página do item. Sem descrições |
| Itens de raridade variável | Separados em variantes (ex.: "Armor +1" Rare, "Armor +3" Legendary) |
| Artefatos | Fora do sorteio por padrão; opção para incluir |
| Idioma | Interface em português. Nome do item em português com o nome em inglês em fonte menor ao lado |
| Plataforma | Next.js (App Router, TypeScript, Tailwind), hospedado na Vercel. Sem backend |
| Persistência | `localStorage`. JSON apenas para exportar e restaurar backup |
| Backup | 10 snapshots internos com restauração + exportar/importar manual |
| Preço | Preço base por raridade (consumíveis pela metade), com variação aleatória, percentual geral, percentual individual e edição manual |
| Tipos | Mestre escolhe quais tipos entram na geração e, opcionalmente, o percentual de cada tipo |
| Repetição | Opção para permitir ou não itens repetidos |
| Poções e pergaminhos | Quantidade sorteada numa faixa configurável (ex.: poções 1–3, pergaminhos 1–5) |
| Visual | Inspirado no AD&D 2ª edição, sem uso de marcas ou arte da Wizards |

## Arquitetura

Toda a lógica roda no navegador. Componentes com estado usam `"use client"`.

```
src/
  app/
    page.tsx                grade de cards das lojas
    loja/[id]/page.tsx      detalhe da loja: itens, informações, NPCs
    configuracoes/page.tsx  backup, restauração, snapshots
  data/
    items.json              catálogo (~400 itens, gerado por script)
  lib/
    types.ts                Item, Loja, ConfigGeracao, Npc
    catalog.ts              carrega e filtra o catálogo
    generator.ts            algoritmo de sorteio (puro, testável)
    pricing.ts              cálculo de preço
    storage.ts              localStorage, snapshots, import/export
  components/               ShopCard, ItemRow, GeneratorForm, NpcList...
scripts/
  scrape-aidedd.ts          extrai a lista do AideDD para items.json
```

### Catálogo

- `scripts/scrape-aidedd.ts` roda uma vez, fora do app, e gera `src/data/items.json`.
- Campos extraídos: slug, nome em inglês, tipo, raridade, sintonização, fonte, URL.
- Itens com raridade variável viram variantes separadas.
- Nomes em português são adicionados como campo extra, seguindo a tradução oficial brasileira quando conhecida.
- O catálogo entra no bundle. O app não consulta o AideDD em tempo de execução; apenas linka para a página do item.

### Estado

- `lojinha:v1` — todas as lojas.
- `lojinha:snapshots` — 10 versões mais recentes. Um snapshot é criado no máximo a cada 5 minutos de edição e sempre antes de restaurar ou importar.
- O backup exportado contém `schemaVersion`, para permitir migrações.
- Salvamento automático com debounce de 500 ms. Não há botão "salvar".

## Modelo de dados

```ts
type Rarity = "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
type ItemType = "armor" | "potion" | "ring" | "rod" | "scroll" | "staff" | "wand" | "weapon" | "wondrous"

interface CatalogItem {
  id: string
  nameEn: string
  namePt: string
  type: ItemType
  rarity: Rarity
  attunement: boolean
  url: string
  consumable: boolean
}

interface ShopItem {
  itemId: string
  qty: number
  priceMods: { random: number; individual: number } // em %
  priceOverride?: number                             // GP, manual
  sold: number
}

interface GenConfig {
  rarityCounts: Record<Rarity, number>
  types: ItemType[]                        // tipos marcados
  typeWeights?: Record<ItemType, number>   // ausente = tudo randômico
  allowRepeat: boolean
  qtyRange: { potion: [number, number]; scroll: [number, number] }
  randomVariance: number                   // ±%, 0 = desligado
  generalMod: number                       // % aplicado à loja toda
  includeArtifacts: boolean
}

interface Npc { id: string; name: string; role: string; description: string }

interface Shop {
  id: string
  name: string
  location: string
  kind: string
  description: string
  notes: string
  npcs: Npc[]
  items: ShopItem[]
  lastConfig?: GenConfig
  createdAt: string
  updatedAt: string
}
```

## Algoritmo de geração

1. Para cada raridade, sortear N vezes (N = `rarityCounts[rarity]`).
2. Com `typeWeights`: sortear o tipo pelos pesos, entre os tipos marcados que tenham itens na raridade. Os pesos são probabilidades, então o resultado se aproxima do percentual pedido sem ser exato. Sem `typeWeights`: sortear direto entre todos os itens elegíveis (os itens maravilhosos predominam, pois são cerca de metade do catálogo).
3. Sortear o item. Com `allowRepeat` desligado, excluir itens já presentes na loja. Com `allowRepeat` ligado, um item repetido soma quantidade.
4. Se o item for poção ou pergaminho, sortear a quantidade na faixa de `qtyRange`.
5. Se `randomVariance > 0`, atribuir `random ∈ [-v, +v]` ao item.
6. Se o pool esgotar, gerar o possível e avisar (ex.: "Só 2 de 5 Rare disponíveis com esses filtros").

"+ Aleatório" em uma loja existente usa a mesma função, com `lastConfig` pré-preenchida e editável, e acrescenta os itens à lista.

O gerador recebe um RNG com seed, para testes reproduzíveis.

## Preço

Preço base por raridade (DMG 2024):

| Raridade | Base (GP) |
|---|---|
| Common | 100 |
| Uncommon | 400 |
| Rare | 4.000 |
| Very Rare | 40.000 |
| Legendary | 200.000 |
| Artifact | sem preço |

Consumíveis (poções e pergaminhos) custam metade.

Artefatos não têm preço base. O preço de um artefato é sempre definido manualmente pelo mestre (`priceOverride`). Até lá, a lista mostra "—" e os percentuais (aleatório, geral, individual) não se aplicam.

```
final = base × (1 + random%) × (1 + geral%) × (1 + individual%)
```

Arredondado para GP inteiro. `priceOverride`, quando presente, substitui o cálculo. A lista mostra o preço final com o preço base riscado.

## Telas

### `/` — Lojas

- Topo: título, botão "Nova loja", engrenagem para configurações.
- Grade de cards: 1 coluna no celular, 2 no tablet, 3–4 no desktop.
- Card: nome, local, tipo, chips de contagem por raridade (ex.: `6 C · 4 U · 2 R`).
- Menu "⋯" no card: Duplicar, Excluir (com confirmação).
- Busca por nome ou local.
- "Nova loja" abre um modal com nome, local e tipo, cria a loja vazia e navega para ela.

### `/loja/[id]` — Loja

Três abas:

1. **Itens**
   - Loja vazia: formulário de geração (quantidade por raridade, tipos marcados, percentual por tipo ou "tudo randômico", repetição, faixas de poção e pergaminho, variação aleatória, percentual geral, incluir artefatos).
   - Loja com itens: lista agrupada por raridade. Cada linha tem nome PT, nome EN menor, ícone do tipo, selo de sintonização, quantidade, preço final e preço base riscado.
   - Tocar na linha abre a edição: quantidade, percentual individual, preço manual, vendido (±1), link "Ver no AideDD ↗", remover.
   - Ações: **+ Aleatório**, **+ Manual** (busca no catálogo em PT ou EN, filtros de raridade e tipo), **Regerar tudo** (com confirmação).
   - Filtros por tipo e raridade e ordenação da lista.
2. **Informações** — local, tipo, descrição, anotações do mestre. Salvamento automático.
3. **NPCs** — lista com nome, papel e descrição. Adicionar, editar, remover.

### `/configuracoes`

- Exportar backup (.json).
- Importar backup: mostra prévia (ex.: "12 lojas") e pergunta se substitui ou mescla.
- Lista dos 10 snapshots internos (data, número de lojas) com botão "Restaurar".

## Visual

Inspirado no AD&D 2ª edição (anos 90). Não usa logo, arte ou marca da Wizards.

- Fundo de pergaminho envelhecido (creme e sépia) feito em CSS, com gradientes e ruído SVG.
- Tipografia via `next/font` (Google Fonts):
  - Títulos: `IM Fell English SC`.
  - Texto: `Crimson Pro`.
  - Números e tabelas de preço: `IM Fell DW Pica`.
- Cores: tinta marrom-escura no texto, vermelho-sangue em títulos e divisores, dourado envelhecido nas bordas.
- Raridades em selos de lacre: Common cinza-ferro, Uncommon verde-musgo, Rare azul-cobalto, Very Rare púrpura, Legendary âmbar, Artifact carmim.
- Cards com moldura dupla e cantos ornamentados em SVG. A primeira letra do nome da loja aparece como capitular iluminada.
- Listas no estilo das tabelas dos livros antigos: cabeçalho em versalete, linhas alternadas, filetes finos.
- Ícones de traço estilo xilogravura para os nove tipos de item.
- Modo escuro "pergaminho à luz de vela": fundo marrom-escuro, texto creme.
- Contraste mínimo AA.

## Tratamento de erros

- `localStorage` indisponível ou cheio: aviso fixo sugerindo exportar o backup.
- JSON de importação inválido ou com esquema desconhecido: rejeitado com mensagem clara. Os dados atuais ficam intactos, e um snapshot é criado antes de qualquer importação.
- `id` de loja inexistente: página "Loja não encontrada" com link de volta.
- Pool de sorteio insuficiente: aviso descrito no algoritmo.

## Testes

- **Vitest**
  - `generator.ts`: contagens por raridade, pesos de tipo, repetição ligada e desligada, faixas de quantidade, pool esgotado.
  - `pricing.ts`: composição dos percentuais, consumíveis pela metade, preço manual.
  - `storage.ts`: rotação dos snapshots, exportação e importação, migração de esquema.
- **Validação do catálogo:** script que confere tipo e raridade válidos e nome em português preenchido em todos os itens.
- **Verificação manual** no navegador em larguras de celular e desktop.
