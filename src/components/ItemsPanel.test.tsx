import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { ItemsPanel } from "./ItemsPanel";
import { indexCatalog } from "@/lib/catalog";
import { mulberry32 } from "@/lib/random";
import type { Shop } from "@/lib/types";
import { fixtureCatalog } from "@/lib/__fixtures__/catalog";
import { makeShop, makeShopItem } from "@/lib/__fixtures__/shop";

const index = indexCatalog(fixtureCatalog);
let latest: Shop;

function Harness({ initial }: { initial: Shop }) {
  const [shop, setShop] = useState(initial);
  useEffect(() => {
    latest = shop;
  }, [shop]);
  return (
    <ItemsPanel shop={shop} catalog={fixtureCatalog} index={index} rng={mulberry32(1)} onChange={setShop} />
  );
}

function setup(initial: Shop = makeShop()) {
  render(<Harness initial={initial} />);
  return userEvent.setup();
}

describe("ItemsPanel", () => {
  it("loja vazia mostra o formulário de geração", () => {
    setup();
    expect(screen.getByRole("button", { name: "Gerar itens" })).toBeInTheDocument();
  });

  it("gera itens, mostra a lista e guarda a configuração", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("region", { name: "Comum" })).toBeInTheDocument();
    expect(latest.items).toHaveLength(10);
    expect(latest.lastConfig?.rarityCounts.common).toBe(4);
  });

  it("avisa quando faltam itens para a raridade pedida", async () => {
    const user = setup();
    await user.clear(screen.getByLabelText("Raro"));
    await user.type(screen.getByLabelText("Raro"), "5");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(screen.getByRole("status")).toHaveTextContent("Só 2 de 5 Raro disponíveis com esses filtros.");
  });

  it("+ Manual acrescenta o item escolhido", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1")] }));
    await user.click(screen.getByRole("button", { name: "+ Manual" }));
    await user.click(screen.getByRole("button", { name: "Adicionar Bolsa Guarda-Tudo" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ })).toBeInTheDocument();
  });

  it("+ Aleatório acrescenta sem apagar os itens atuais", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1")] }));
    await user.click(screen.getByRole("button", { name: "+ Aleatório" }));
    await user.click(screen.getByRole("button", { name: "Acrescentar itens" }));
    expect(latest.items[0].itemId).toBe("armor-plus-1");
    expect(latest.items.length).toBeGreaterThan(1);
    expect(latest.items.filter((i) => i.itemId === "armor-plus-1")).toHaveLength(1);
  });

  it("Regerar tudo pede confirmação antes de trocar a lista", async () => {
    const user = setup(makeShop({ items: [makeShopItem("legendary-weapon")] }));
    await user.click(screen.getByRole("button", { name: "Regerar tudo" }));
    expect(latest.items.map((i) => i.itemId)).toEqual(["legendary-weapon"]);
    await user.click(screen.getByRole("button", { name: "Regerar" }));
    expect(latest.items.map((i) => i.itemId)).not.toContain("legendary-weapon");
  });

  it("abre o editor pela linha e remove o item", async () => {
    const user = setup(makeShop({ items: [makeShopItem("armor-plus-1"), makeShopItem("bag-of-holding")] }));
    await user.click(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ }));
    const dialog = screen.getByRole("dialog", { name: "Bolsa Guarda-Tudo" });
    await user.click(within(dialog).getByRole("button", { name: "Remover item" }));
    expect(latest.items.map((i) => i.itemId)).toEqual(["armor-plus-1"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marca vendido pelo editor", async () => {
    const user = setup(makeShop({ items: [makeShopItem("bag-of-holding", { qty: 2 })] }));
    await user.click(screen.getByRole("button", { name: /Bolsa Guarda-Tudo/ }));
    await user.click(screen.getByRole("button", { name: "Aumentar vendidos" }));
    expect(latest.items[0].sold).toBe(1);
  });
});
