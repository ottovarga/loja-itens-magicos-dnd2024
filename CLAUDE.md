# CLAUDE.md

Gerador de lojas de itens mágicos para D&D 5.5 (regras 2024). O mestre cria lojas, sorteia itens reais do DMG 2024 segundo parâmetros próprios, edita a lista e registra local, NPCs e anotações.

Design aprovado: [docs/plans/2026-09-22-loja-itens-magicos-design.md](docs/plans/2026-09-22-loja-itens-magicos-design.md). Leia antes de qualquer mudança de comportamento. Se uma tarefa contradiz o design, pergunte antes de implementar.

Repositório: https://github.com/ottovarga/loja-itens-magicos-dnd2024

## Stack

- Next.js (App Router), TypeScript `strict`, Tailwind CSS.
- Deploy na Vercel. Sem backend, sem banco. Toda a lógica roda no navegador.
- Estado em `localStorage`. JSON só para exportar e restaurar backup.
- Testes com Vitest. Componentes com Testing Library + jsdom.

## Comandos

```bash
npm run dev          # servidor local
npm test             # Vitest em modo watch
npm run test:run     # Vitest uma vez (CI)
npm run lint
npm run typecheck    # tsc --noEmit
npm run build
npm run catalog:validate   # valida src/data/items.json
```

## TDD é obrigatório

Todo código de produção nasce de um teste que falhou antes.

1. **Red.** Escreva um teste pequeno para um único comportamento. Rode e confirme que ele falha pelo motivo esperado (não por erro de import ou sintaxe).
2. **Green.** Escreva o mínimo de código para o teste passar. Nada além do que o teste exige.
3. **Refactor.** Limpe código e teste com a suíte verde. Rode de novo.

Regras:

- Não escreva código de produção sem um teste falhando que o justifique. Se escreveu, apague e recomece pelo teste.
- Bug encontrado: primeiro um teste que reproduz o bug, depois a correção.
- Um comportamento por teste. Nome do teste descreve o comportamento em português: `it("não repete itens quando allowRepeat está desligado")`.
- Não marque tarefa como concluída sem rodar `npm run test:run`, `npm run typecheck` e `npm run lint` e ver tudo passar. Informe a saída real, inclusive falhas.
- Não altere um teste para fazê-lo passar, a menos que o requisito tenha mudado. Nesse caso, diga qual requisito mudou.
- Não use `it.skip`, `it.only` ou `@ts-expect-error` para contornar falhas.

## Arquitetura orientada a testes

A lógica de negócio fica em `src/lib/` como funções puras, sem React e sem acesso direto ao navegador. Componentes só chamam essas funções e renderizam.

| Módulo | Responsabilidade | Como testar |
|---|---|---|
| `lib/generator.ts` | Sorteio de itens | Funções puras com RNG injetado |
| `lib/pricing.ts` | Cálculo de preço | Funções puras, tabela de casos |
| `lib/catalog.ts` | Filtros do catálogo | Catálogo de fixture pequeno |
| `lib/storage.ts` | localStorage, snapshots, import/export | `Storage` injetado (fake em memória) |
| `components/` | UI | Testing Library, comportamento visível ao usuário |

### Aleatoriedade

- Nunca chame `Math.random()` dentro de `lib/`. Receba um `rng: () => number` como parâmetro.
- Nos testes, use um RNG com seed (ex.: mulberry32) ou uma sequência fixa de valores.
- Teste propriedades, não sorteios exatos, quando a ordem não importa: contagem por raridade, ausência de repetição, quantidade dentro da faixa.

### Tempo e IDs

- Injete `now: () => Date` e `newId: () => string` onde houver datas ou IDs. Não dependa do relógio real nos testes.

### Storage

- `storage.ts` recebe uma interface `Storage` (mesma do DOM). Nos testes, use um fake em memória. Não use `localStorage` real nem mocks de módulo para isso.

### Fixtures

- Testes de lógica usam um catálogo de fixture pequeno em `src/lib/__fixtures__/`, não o `items.json` completo. Assim o teste controla exatamente quais itens existem por tipo e raridade.

## Regras de domínio que os testes devem cobrir

- Preço base por raridade: Common 100, Uncommon 400, Rare 4.000, Very Rare 40.000, Legendary 200.000 GP.
- Poções e pergaminhos custam metade do preço base.
- Artefatos não têm preço. O preço é sempre manual (`priceOverride`). Sem ele, o preço é `null` e aparece "—". Percentuais não se aplicam a artefatos.
- Preço final: `base × (1 + random%) × (1 + geral%) × (1 + individual%)`, arredondado para GP inteiro. `priceOverride` substitui tudo.
- Artefatos ficam fora do sorteio salvo com `includeArtifacts`.
- `typeWeights` ausente significa sorteio uniforme entre todos os itens elegíveis.
- Tipo sem itens na raridade é ignorado no sorteio por tipo.
- `allowRepeat` desligado: nenhum item repetido na loja, inclusive ao acrescentar itens a uma lista existente. Ligado: item repetido soma quantidade.
- Poções e pergaminhos recebem quantidade sorteada dentro de `qtyRange`, limites inclusos.
- Pool insuficiente: gera o possível e retorna aviso com quantos faltaram por raridade. Não lança erro.
- Snapshots: no máximo 10, o mais antigo sai primeiro. Snapshot criado antes de importar ou restaurar.
- Importação de JSON inválido ou com `schemaVersion` desconhecido não altera os dados atuais.

## Convenções

- Interface e textos em português. Nomes de itens: português com o inglês em fonte menor ao lado.
- Código (variáveis, funções, tipos) em inglês. Nomes de testes em português.
- O catálogo `src/data/items.json` é gerado por `scripts/scrape-aidedd.ts`. Não copie descrições de itens; guarde só nome, tipo, raridade, sintonização, fonte e URL do AideDD.
- Visual inspirado no AD&D 2ª edição. Não use logo, arte ou marca da Wizards.
