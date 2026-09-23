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
