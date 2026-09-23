import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { ShopInfoForm } from "./ShopInfoForm";
import type { Shop } from "@/lib/types";
import { makeShop } from "@/lib/__fixtures__/shop";

let latest: Shop;

function Harness() {
  const [shop, setShop] = useState(makeShop({ location: "" }));
  useEffect(() => {
    latest = shop;
  }, [shop]);
  return <ShopInfoForm shop={shop} onChange={setShop} />;
}

describe("ShopInfoForm", () => {
  it("edita local, tipo, descrição e anotações", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Local"), "Baldur's Gate");
    await user.clear(screen.getByLabelText("Tipo de loja"));
    await user.type(screen.getByLabelText("Tipo de loja"), "Penhor");
    await user.type(screen.getByLabelText("Descrição"), "Cheira a incenso.");
    await user.type(screen.getByLabelText("Anotações do mestre"), "O dono é um doppelganger.");
    expect(latest).toMatchObject({
      location: "Baldur's Gate",
      kind: "Penhor",
      description: "Cheira a incenso.",
      notes: "O dono é um doppelganger.",
    });
  });

  it("edita o nome", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Nova");
    expect(latest.name).toBe("Nova");
  });
});
