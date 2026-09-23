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
