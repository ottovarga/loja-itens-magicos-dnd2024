import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsView } from "./SettingsView";
import { createSnapshot, exportBackup, loadShops, parseBackup } from "@/lib/storage";
import { makeDeps } from "@/lib/__fixtures__/deps";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shopA = makeShop({ id: "a", name: "Loja A" });
const shopB = makeShop({ id: "b", name: "Loja B" });

const savedNames = (storage: Storage) => {
  const result = loadShops(storage);
  return result.ok ? result.value.map((s) => s.name) : result.error;
};

const jsonFile = (content: string) => new File([content], "backup.json", { type: "application/json" });

describe("SettingsView", () => {
  it("exporta backup com as lojas atuais", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    renderWithShops(<SettingsView onDownload={onDownload} />, { shops: [shopA] });
    await user.click(screen.getByRole("button", { name: "Exportar backup" }));
    const [fileName, content] = onDownload.mock.calls[0];
    expect(fileName).toBe("lojinha-backup-2026-09-22.json");
    expect(parseBackup(content)).toMatchObject({ ok: true, value: { shops: [shopA] } });
  });

  it("rejeita JSON inválido sem mexer nos dados", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile("{lixo"));
    expect(await screen.findByText("O arquivo não é um JSON válido. Nada foi alterado.")).toBeInTheDocument();
    expect(savedNames(storage)).toEqual(["Loja A"]);
  });

  it("mostra prévia e substitui as lojas ao confirmar", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile(exportBackup([shopB], makeDeps())));
    expect(await screen.findByText(/Backup com 1 loja\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Substituir tudo" }));
    expect(await screen.findByText(/Agora há 1 loja/)).toBeInTheDocument();
    expect(savedNames(storage)).toEqual(["Loja B"]);
  });

  it("mescla as lojas importadas com as atuais", async () => {
    const user = userEvent.setup();
    const { storage } = renderWithShops(<SettingsView />, { shops: [shopA] });
    await user.upload(screen.getByLabelText("Arquivo de backup"), jsonFile(exportBackup([shopB], makeDeps())));
    await user.click(await screen.findByRole("button", { name: "Mesclar" }));
    expect(savedNames(storage)).toEqual(["Loja A", "Loja B"]);
  });

  it("lista snapshots e restaura depois de confirmar", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    createSnapshot(storage, [shopB], { now: () => new Date("2026-09-20T10:00:00Z"), newId: () => "antigo" });
    renderWithShops(<SettingsView />, { shops: [shopA], storage });
    expect(screen.getByText(/1 loja$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Restaurar snapshot/ }));
    await user.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(savedNames(storage)).toEqual(["Loja B"]);
    expect(screen.getByRole("status")).toHaveTextContent("Snapshot restaurado");
  });
});
