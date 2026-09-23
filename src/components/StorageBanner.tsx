"use client";

import Link from "next/link";
import type { StorageError } from "@/lib/storage";
import { useShops } from "./ShopsProvider";

const MESSAGES: Record<StorageError, string> = {
  unavailable:
    "Não foi possível acessar o armazenamento do navegador. As alterações não serão salvas. Exporte um backup antes de fechar a página.",
  quota: "O armazenamento do navegador está cheio. Exporte um backup para não perder alterações.",
  corrupt:
    "Os dados salvos estão corrompidos e não foram carregados. Importe um backup ou restaure um snapshot.",
};

export function StorageBanner() {
  const { error } = useShops();
  if (!error) return null;
  return (
    <div role="alert" className="frame mx-auto mb-4 max-w-6xl border-blood p-3 text-sm">
      {MESSAGES[error]}{" "}
      <Link href="/configuracoes" className="underline">
        Abrir configurações
      </Link>
    </div>
  );
}
