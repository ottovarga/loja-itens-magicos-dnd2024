import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewShopDialog } from "./NewShopDialog";

describe("NewShopDialog", () => {
  it("não deixa criar sem nome", () => {
    render(<NewShopDialog onCreate={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Criar loja" })).toBeDisabled();
  });

  it("envia nome, local e tipo", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewShopDialog onCreate={onCreate} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText("Nome"), "A Lâmpada");
    await user.type(screen.getByLabelText("Local"), "Calimport");
    await user.type(screen.getByLabelText("Tipo de loja"), "Bazar");
    await user.click(screen.getByRole("button", { name: "Criar loja" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "A Lâmpada", location: "Calimport", kind: "Bazar" });
  });

  it("cancela", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<NewShopDialog onCreate={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
