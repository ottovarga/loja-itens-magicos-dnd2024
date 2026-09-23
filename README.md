# loja-itens-magicos-dnd2024

Gerador de lojas de itens mágicos para D&D 5.5 (regras 2024). O mestre cria lojas, sorteia itens reais do DMG 2024 segundo parâmetros próprios, edita a lista e registra local, NPCs e anotações.

Next.js (App Router), TypeScript e Tailwind. Sem backend: os dados ficam no `localStorage` do navegador, com exportação e importação de backup em JSON.

## Comandos

```bash
npm install
npm run dev              # servidor local em http://localhost:3000
npm run test:run         # testes (Vitest)
npm run typecheck
npm run lint
npm run build
npm run catalog:scrape   # regenera src/data/items.json a partir do AideDD
npm run catalog:validate # valida o catálogo
```

## Documentação

- Design: [docs/plans/2026-09-22-loja-itens-magicos-design.md](docs/plans/2026-09-22-loja-itens-magicos-design.md)
- Plano de implementação: [docs/plans/2026-09-22-loja-itens-magicos.md](docs/plans/2026-09-22-loja-itens-magicos.md)
- Regras para contribuir (TDD, arquitetura): [CLAUDE.md](CLAUDE.md)

O catálogo guarda só nome, tipo, raridade, sintonização, fonte e link para a página do item no [AideDD](https://www.aidedd.org/magic-item/). Sem logo, arte ou marca da Wizards of the Coast.
