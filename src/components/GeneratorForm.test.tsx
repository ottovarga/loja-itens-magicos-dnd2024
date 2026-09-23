import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GeneratorForm } from "./GeneratorForm";
import { defaultGenConfig } from "@/lib/config";
import type { GenConfig } from "@/lib/types";

function setup(initial: GenConfig = defaultGenConfig()) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <GeneratorForm initial={initial} submitLabel="Gerar itens" onSubmit={onSubmit} onCancel={onCancel} />,
  );
  const submitted = (): GenConfig => onSubmit.mock.calls[0][0];
  return { onSubmit, onCancel, submitted, user: userEvent.setup() };
}

describe("GeneratorForm", () => {
  it("envia a configuração inicial", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted()).toEqual(defaultGenConfig());
  });

  it("altera a quantidade de uma raridade", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Raro"));
    await user.type(screen.getByLabelText("Raro"), "5");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().rarityCounts.rare).toBe(5);
  });

  it("campo vazio vira zero ao enviar", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Comum"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().rarityCounts.common).toBe(0);
  });

  it("desmarcar um tipo tira ele do sorteio", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByLabelText("Anel"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().types).not.toContain("ring");
  });

  it("modo percentual envia pesos por tipo", async () => {
    const { submitted, user } = setup();
    await user.click(screen.getByLabelText("Percentual por tipo"));
    await user.clear(screen.getByLabelText("Peso de Arma (%)"));
    await user.type(screen.getByLabelText("Peso de Arma (%)"), "70");
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().typeWeights).toMatchObject({ weapon: 70, ring: 11 });
  });

  it("voltar para tudo randômico remove os pesos", async () => {
    const { submitted, user } = setup({ ...defaultGenConfig(), typeWeights: { weapon: 100 } });
    await user.click(screen.getByLabelText("Tudo randômico"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted().typeWeights).toBeUndefined();
  });

  it("quantidade de artefatos só habilita com Incluir artefatos", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Artefato")).toBeDisabled();
    await user.click(screen.getByLabelText("Incluir artefatos"));
    expect(screen.getByLabelText("Artefato")).toBeEnabled();
  });

  it("envia faixas de consumíveis e percentuais de preço", async () => {
    const { submitted, user } = setup();
    await user.clear(screen.getByLabelText("Poções — máximo"));
    await user.type(screen.getByLabelText("Poções — máximo"), "6");
    await user.clear(screen.getByLabelText("Percentual geral da loja (%)"));
    await user.type(screen.getByLabelText("Percentual geral da loja (%)"), "-10");
    await user.click(screen.getByLabelText("Permitir itens repetidos"));
    await user.click(screen.getByRole("button", { name: "Gerar itens" }));
    expect(submitted()).toMatchObject({
      qtyRange: { potion: [1, 6], scroll: [1, 5] },
      generalMod: -10,
      allowRepeat: true,
    });
  });

  it("cancela", async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
