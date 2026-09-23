import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemEditor } from "./ItemEditor";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShopItem } from "@/lib/__fixtures__/shop";
import type { CatalogItem, ShopItem } from "@/lib/types";

const ring = fixtureCatalog.find((i) => i.id === "ring-of-protection")!;
const axe = fixtureCatalog.find((i) => i.id === "axe-of-the-dwarvish-lords")!;

function setup(item: CatalogItem = ring, shopItem: ShopItem = makeShopItem(item.id, { qty: 2 })) {
  const handlers = {
    onQtyChange: vi.fn(),
    onIndividualChange: vi.fn(),
    onOverrideChange: vi.fn(),
    onSoldChange: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
  };
  render(<ItemEditor shopItem={shopItem} item={item} generalMod={0} {...handlers} />);
  return { ...handlers, user: userEvent.setup() };
}

describe("ItemEditor", () => {
  it("tem link para a página do item no AideDD", () => {
    setup();
    const link = screen.getByRole("link", { name: "Ver no AideDD ↗" });
    expect(link).toHaveAttribute("href", ring.url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("altera a quantidade", () => {
    const { onQtyChange } = setup();
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "4" } });
    expect(onQtyChange).toHaveBeenCalledWith(4);
  });

  it("altera o percentual individual", () => {
    const { onIndividualChange } = setup();
    fireEvent.change(screen.getByLabelText("Percentual individual (%)"), { target: { value: "-20" } });
    expect(onIndividualChange).toHaveBeenCalledWith(-20);
  });

  it("define e limpa o preço manual", async () => {
    const { onOverrideChange } = setup(ring, makeShopItem(ring.id, { priceOverride: 900 }));
    fireEvent.change(screen.getByLabelText("Preço manual (PO)"), { target: { value: "750" } });
    expect(onOverrideChange).toHaveBeenLastCalledWith(750);
    fireEvent.change(screen.getByLabelText("Preço manual (PO)"), { target: { value: "" } });
    expect(onOverrideChange).toHaveBeenLastCalledWith(undefined);
  });

  it("marca vendidos com + e −", async () => {
    const { onSoldChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Aumentar vendidos" }));
    await user.click(screen.getByRole("button", { name: "Diminuir vendidos" }));
    expect(onSoldChange.mock.calls).toEqual([[1], [-1]]);
  });

  it("remove o item", async () => {
    const { onRemove, user } = setup();
    await user.click(screen.getByRole("button", { name: "Remover item" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("artefato sem preço manual mostra travessão e bloqueia percentual", () => {
    setup(axe, makeShopItem(axe.id));
    expect(screen.getByText("Preço: —")).toBeInTheDocument();
    expect(screen.getByLabelText("Percentual individual (%)")).toBeDisabled();
  });
});
