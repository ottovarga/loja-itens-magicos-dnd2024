import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopsProvider } from "./ShopsProvider";
import { StorageBanner } from "./StorageBanner";
import { SHOPS_KEY } from "@/lib/storage";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { renderWithShops, testDeps } from "@/test/renderWithShops";

describe("StorageBanner", () => {
  it("não aparece quando está tudo bem", () => {
    renderWithShops(<StorageBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("avisa sobre dados corrompidos e aponta para as configurações", () => {
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    render(
      <ShopsProvider storage={storage} deps={testDeps()}>
        <StorageBanner />
      </ShopsProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/corrompidos/);
    expect(screen.getByRole("link", { name: "Abrir configurações" })).toHaveAttribute(
      "href",
      "/configuracoes",
    );
  });

  it("avisa quando o armazenamento está indisponível", () => {
    render(
      <ShopsProvider storage={null} deps={testDeps()}>
        <StorageBanner />
      </ShopsProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/não serão salvas/);
  });
});
