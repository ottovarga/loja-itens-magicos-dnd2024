import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShopView } from "./ShopView";
import { loadShops } from "@/lib/storage";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shop = makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar", kind: "Ferreiro" });

function setup(shopId = "a") {
  const result = renderWithShops(<ShopView shopId={shopId} catalog={fixtureCatalog} />, { shops: [shop] });
  return { ...result, user: userEvent.setup() };
}

describe("ShopView", () => {
  it("mostra 'Loja não encontrada' com link de volta", () => {
    setup("nao-existe");
    expect(screen.getByRole("heading", { name: "Loja não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar às lojas" })).toHaveAttribute("href", "/");
  });

  it("mostra nome, local e tipo da loja", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Forja Rúnica" })).toBeInTheDocument();
    expect(screen.getByText("Mirabar · Ferreiro")).toBeInTheDocument();
  });

  it("abre na aba Itens", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Itens" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Gerar itens" })).toBeInTheDocument();
  });

  it("troca para a aba NPCs", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "NPCs" }));
    expect(screen.getByRole("tab", { name: "NPCs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Adicionar NPC" })).toBeInTheDocument();
  });

  it("editar o nome em Informações atualiza o título", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "Informações" }));
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Nova Forja");
    expect(screen.getByRole("heading", { level: 1, name: "Nova Forja" })).toBeInTheDocument();
  });

  it("gerar itens grava a loja", async () => {
    const { user, storage } = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("region", { name: "Comum" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const saved = loadShops(storage);
    expect(saved.ok && saved.value[0].items).toHaveLength(10);
  });
});
