import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShopCard } from "./ShopCard";
import { indexCatalog } from "@/lib/catalog";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop, makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const shop = makeShop({
  id: "a",
  name: "Forja Rúnica",
  location: "Mirabar",
  kind: "Ferreiro",
  items: [
    makeShopItem("potion-of-healing"),
    makeShopItem("common-wondrous-1"),
    makeShopItem("armor-plus-1"),
  ],
});

function setup(overrides = {}) {
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  render(
    <ShopCard
      shop={{ ...shop, ...overrides }}
      catalogIndex={index}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />,
  );
  return { onDuplicate, onDelete, user: userEvent.setup() };
}

describe("ShopCard", () => {
  it("mostra nome com link, local, tipo e chips de raridade", () => {
    setup();
    expect(screen.getByRole("link", { name: "Forja Rúnica" })).toHaveAttribute("href", "/loja/a");
    expect(screen.getByText("Mirabar · Ferreiro")).toBeInTheDocument();
    expect(screen.getByText("2 C · 1 R")).toBeInTheDocument();
  });

  it("mostra 'Sem itens' para loja vazia", () => {
    setup({ items: [] });
    expect(screen.getByText("Sem itens")).toBeInTheDocument();
  });

  it("duplica pelo menu", async () => {
    const { onDuplicate, user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });

  it("só exclui depois da confirmação", async () => {
    const { onDelete, user } = setup();
    await user.click(screen.getByRole("button", { name: "Ações de Forja Rúnica" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
