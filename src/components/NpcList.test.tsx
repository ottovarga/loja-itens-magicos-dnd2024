import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { NpcList } from "./NpcList";
import type { Npc } from "@/lib/types";
import { makeDeps } from "@/lib/__fixtures__/deps";

let latest: Npc[];

function Harness({ initial = [] }: { initial?: Npc[] }) {
  const [npcs, setNpcs] = useState(initial);
  const [deps] = useState(() => makeDeps());
  useEffect(() => {
    latest = npcs;
  }, [npcs]);
  return <NpcList npcs={npcs} deps={deps} onChange={setNpcs} />;
}

describe("NpcList", () => {
  it("mostra aviso quando não há NPCs", () => {
    render(<Harness />);
    expect(screen.getByText("Nenhum NPC ainda.")).toBeInTheDocument();
  });

  it("adiciona e edita um NPC", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Adicionar NPC" }));
    const card = screen.getByRole("group", { name: "NPC sem nome" });
    await user.type(within(card).getByLabelText("Nome"), "Brom");
    await user.type(within(screen.getByRole("group", { name: "Brom" })).getByLabelText("Papel"), "Dono");
    expect(latest).toEqual([{ id: "id-1", name: "Brom", role: "Dono", description: "" }]);
  });

  it("remove um NPC", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "a", name: "Lia", role: "", description: "" }]} />);
    await user.click(screen.getByRole("button", { name: "Remover Lia" }));
    expect(latest).toEqual([]);
  });
});
