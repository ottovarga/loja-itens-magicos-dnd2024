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
