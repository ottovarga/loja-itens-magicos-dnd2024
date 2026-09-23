import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "./HomeView";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop } from "@/lib/__fixtures__/shop";
import { renderWithShops } from "@/test/renderWithShops";

const shops = [
  makeShop({ id: "a", name: "Forja Rúnica", location: "Mirabar" }),
  makeShop({ id: "b", name: "Bazar das Areias", location: "Calimport" }),
];

function setup(initial = shops) {
  const onOpenShop = vi.fn();
  renderWithShops(<HomeView catalog={fixtureCatalog} onOpenShop={onOpenShop} />, { shops: initial });
  return { onOpenShop, user: userEvent.setup() };
}

describe("HomeView", () => {
  it("lista as lojas em cards", () => {
    setup();
    expect(screen.getByRole("link", { name: "Forja Rúnica" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bazar das Areias" })).toBeInTheDocument();
  });

  it("convida a criar a primeira loja quando não há nenhuma", () => {
    setup([]);
    expect(screen.getByText("Nenhuma loja ainda. Crie a primeira.")).toBeInTheDocument();
  });

  it("busca por nome ou local", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Buscar por nome ou local" }), "calim");
    expect(screen.queryByRole("link", { name: "Forja Rúnica" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bazar das Areias" })).toBeInTheDocument();
  });

  it("cria loja e abre a página dela", async () => {
    const { onOpenShop, user } = setup([]);
    await user.click(screen.getByRole("button", { name: "Nova loja" }));
    await user.type(screen.getByLabelText("Nome"), "A Lâmpada");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));
    expect(onOpenShop).toHaveBeenCalledWith("id-1");
    expect(screen.getByRole("link", { name: "A Lâmpada" })).toBeInTheDocument();
  });

  it("duplica uma loja", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(screen.getByRole("link", { name: "Forja Rúnica (cópia)" })).toBeInTheDocument();
  });

  it("exclui uma loja depois de confirmar", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(screen.queryByRole("link", { name: "Forja Rúnica" })).not.toBeInTheDocument();
  });
});
