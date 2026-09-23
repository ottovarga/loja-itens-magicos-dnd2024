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
