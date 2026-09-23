"use client";

import { useState, type ChangeEvent } from "react";
import {
  backupFileName,
  exportBackup,
  importBackup,
  listSnapshots,
  parseBackup,
  restoreSnapshot,
  type ImportMode,
  type ParseError,
  type StorageError,
} from "@/lib/storage";
import { ConfirmDialog } from "./ConfirmDialog";
import { downloadFile } from "./download";
import { readFileText } from "./readFileText";
import { useShops } from "./ShopsProvider";

const ERROR_MESSAGES: Record<ParseError | StorageError | "not_found", string> = {
  invalid_json: "O arquivo não é um JSON válido. Nada foi alterado.",
  unknown_schema: "Versão de backup desconhecida. Nada foi alterado.",
  invalid_shape: "O arquivo não tem o formato de backup da Lojinha. Nada foi alterado.",
  unavailable: "O armazenamento do navegador está indisponível.",
  quota: "O armazenamento do navegador está cheio.",
  corrupt: "Os dados salvos estão corrompidos.",
  not_found: "Snapshot não encontrado.",
};

const shopCount = (n: number) => `${n} ${n === 1 ? "loja" : "lojas"}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

interface SettingsViewProps {
  onDownload?: (fileName: string, content: string) => void;
}

export function SettingsView({ onDownload = downloadFile }: SettingsViewProps) {
  const { shops, storage, deps, loaded, replaceAll } = useShops();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ json: string; count: number } | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [, refresh] = useState(0);

  if (!loaded) return <p>Carregando…</p>;
  const snapshots = storage ? listSnapshots(storage) : [];

  function handleExport() {
    onDownload(backupFileName(deps), exportBackup(shops, deps));
    setMessage(`Backup exportado com ${shopCount(shops.length)}.`);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const json = await readFileText(file);
    input.value = "";
    const parsed = parseBackup(json);
    if (!parsed.ok) {
      setPending(null);
      setMessage(ERROR_MESSAGES[parsed.error]);
      return;
    }
    setMessage(null);
    setPending({ json, count: parsed.value.shops.length });
  }

  function handleImport(mode: ImportMode) {
    if (!storage || !pending) return;
    const result = importBackup(storage, shops, pending.json, mode, deps);
    setPending(null);
    if (!result.ok) {
      setMessage(ERROR_MESSAGES[result.error]);
      return;
    }
    replaceAll(result.value);
    setMessage(`Backup importado. Agora há ${shopCount(result.value.length)}.`);
    refresh((n) => n + 1);
  }

  function handleRestore() {
    if (!storage || !restoreId) return;
    const result = restoreSnapshot(storage, shops, restoreId, deps);
    setRestoreId(null);
    if (!result.ok) {
      setMessage(ERROR_MESSAGES[result.error]);
      return;
    }
    replaceAll(result.value);
    setMessage("Snapshot restaurado. O estado anterior foi guardado como um snapshot novo.");
    refresh((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="title text-3xl">Configurações</h1>
      {message && (
        <p role="status" className="frame p-3">
          {message}
        </p>
      )}

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Exportar</h2>
        <p className="mb-3 text-sm">Baixa um arquivo .json com todas as lojas.</p>
        <button type="button" className="btn btn-primary" onClick={handleExport}>
          Exportar backup
        </button>
      </section>

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Importar</h2>
        {storage ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm">Arquivo de backup</span>
            <input type="file" accept="application/json,.json" onChange={handleFile} />
          </label>
        ) : (
          <p className="text-sm">Armazenamento do navegador indisponível.</p>
        )}
        {pending && (
          <div className="mt-3 flex flex-col gap-2">
            <p>
              Backup com {shopCount(pending.count)}. Antes de importar, um snapshot do estado atual será
              criado.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => handleImport("replace")}>
                Substituir tudo
              </button>
              <button type="button" className="btn" onClick={() => handleImport("merge")}>
                Mesclar
              </button>
              <button type="button" className="btn" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="frame p-4">
        <h2 className="title mb-2 text-xl">Snapshots</h2>
        <p className="mb-3 text-sm">
          Até 10 cópias automáticas, a mais recente primeiro. Uma nova cópia é criada no máximo a cada 5
          minutos de edição e sempre antes de importar ou restaurar.
        </p>
        {snapshots.length === 0 ? (
          <p>Nenhum snapshot ainda.</p>
        ) : (
          <ul>
            {snapshots.map((snapshot) => (
              <li key={snapshot.id} className="flex items-center justify-between gap-2 border-b border-rule py-2">
                <span className="numbers">{`${formatDate(snapshot.createdAt)} — ${shopCount(snapshot.shops.length)}`}</span>
                <button
                  type="button"
                  className="btn"
                  aria-label={`Restaurar snapshot de ${formatDate(snapshot.createdAt)}`}
                  onClick={() => setRestoreId(snapshot.id)}
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {restoreId && (
        <ConfirmDialog
          title="Restaurar snapshot"
          message="As lojas atuais serão substituídas por este snapshot. Antes disso, o estado atual vira um snapshot novo."
          confirmLabel="Restaurar"
          onConfirm={handleRestore}
          onCancel={() => setRestoreId(null)}
        />
      )}
    </div>
  );
}
