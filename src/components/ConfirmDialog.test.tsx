import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Excluir loja"
      message="Tem certeza?"
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel, user: userEvent.setup() };
}

describe("ConfirmDialog", () => {
  it("mostra título e mensagem num diálogo", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Excluir loja" })).toHaveTextContent("Tem certeza?");
  });

  it("confirma pelo botão de confirmação", async () => {
    const { onConfirm, onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancela pelo botão Cancelar", async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancela com Esc", async () => {
    const { onCancel, user } = setup();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
