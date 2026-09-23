import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogPicker } from "./CatalogPicker";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";

function setup() {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(<CatalogPicker catalog={fixtureCatalog} onPick={onPick} onClose={onClose} />);
  return { onPick, onClose, user: userEvent.setup() };
}

describe("CatalogPicker", () => {
  it("busca em português sem acento", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Buscar no catálogo" }), "bolsa");
    expect(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 item");
  });

  it("filtra por raridade", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Raridade"), "Raro");
    expect(screen.getByRole("status")).toHaveTextContent("2 itens");
  });

  it("adiciona o item escolhido e confirma na tela", async () => {
    const { onPick, user } = setup();
    await user.click(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" }));
    expect(onPick).toHaveBeenCalledWith("bag-of-holding");
    expect(screen.getByRole("status")).toHaveTextContent("Adicionado: Bolsa Guarda-Tudo");
  });

  it("fecha em Concluir", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
