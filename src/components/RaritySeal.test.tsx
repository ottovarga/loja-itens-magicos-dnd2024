import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RaritySeal } from "./RaritySeal";

describe("RaritySeal", () => {
  it("mostra o nome da raridade em português", () => {
    render(<RaritySeal rarity="very_rare" />);
    expect(screen.getByText("Muito Raro")).toBeInTheDocument();
  });

  it("mostra a sigla no modo curto, com o nome completo no título", () => {
    render(<RaritySeal rarity="very_rare" short />);
    expect(screen.getByText("VR")).toHaveAttribute("title", "Muito Raro");
  });
});
