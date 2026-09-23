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
