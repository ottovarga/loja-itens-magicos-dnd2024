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
