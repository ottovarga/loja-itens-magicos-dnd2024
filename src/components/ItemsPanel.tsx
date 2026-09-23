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
