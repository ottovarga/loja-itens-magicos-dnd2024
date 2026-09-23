import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemList } from "./ItemList";
import { indexCatalog } from "@/lib/catalog";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
const items = [
  makeShopItem("ring-of-protection", { priceMods: { random: 0, individual: 10 } }),
  makeShopItem("potion-of-healing", { qty: 3, sold: 1 }),
  makeShopItem("bag-of-holding"),
];

function setup() {
  const onSelect = vi.fn();
  render(<ItemList items={items} index={index} generalMod={0} onSelect={onSelect} />);
  return { onSelect, user: userEvent.setup() };
}

describe("ItemList", () => {
  it("agrupa por raridade na ordem certa", () => {
    setup();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Comum",
      "Incomum",
      "Raro",
    ]);
  });

  it("mostra nome em português e em inglês", () => {
    setup();
    const row = screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ });
    expect(row).toHaveTextContent("Bag of Holding");
  });

  it("mostra preço final e preço base riscado quando diferem", () => {
    setup();
    const rare = screen.getByRole("region", { name: "Raro" });
    expect(within(rare).getByText("4.400 PO")).toBeInTheDocument();
    expect(within(rare).getByText("4.000 PO").tagName).toBe("S");
  });

  it("mostra quantidade e vendidos", () => {
    setup();
    const common = screen.getByRole("region", { name: "Comum" });
    expect(within(common).getByText("×3")).toBeInTheDocument();
    expect(within(common).getByText("1 vend.")).toBeInTheDocument();
  });

  it("marca itens que exigem sintonização", () => {
    setup();
    expect(screen.getByTitle("Requer sintonização")).toBeInTheDocument();
  });

  it("filtra por tipo", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "Poção");
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Comum"]);
  });

  it("avisa quando o filtro esvazia a lista", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "Cajado");
    expect(screen.getByText("Nenhum item com esses filtros.")).toBeInTheDocument();
  });

  it("abre o item ao clicar na linha", async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByRole("button", { name: /Anel de Proteção|ring-of-protection/ }));
    expect(onSelect).toHaveBeenCalledWith("ring-of-protection");
  });
});
