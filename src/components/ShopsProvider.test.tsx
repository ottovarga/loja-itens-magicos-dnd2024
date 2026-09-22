import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShopsProvider, SAVE_DELAY_MS, useShops } from "./ShopsProvider";
import { SHOPS_KEY, listSnapshots, loadShops, saveShops } from "@/lib/storage";
import { makeShop } from "@/lib/__fixtures__/shop";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";
import { testDeps } from "@/test/renderWithShops";

function Probe() {
  const { shops, loaded, error, upsertShop } = useShops();
  return (
    <div>
      <p>{loaded ? "carregado" : "carregando"}</p>
      <p data-testid="error">{error ?? "sem erro"}</p>
      <ul>
        {shops.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
      <button onClick={() => upsertShop(makeShop({ id: "nova", name: "Loja Nova" }))}>criar</button>
    </div>
  );
}

function renderProbe(storage: Storage | null) {
  return render(
    <ShopsProvider storage={storage} deps={testDeps()}>
      <Probe />
    </ShopsProvider>,
  );
}

const savedNames = (storage: Storage) => {
  const result = loadShops(storage);
  return result.ok ? result.value.map((s) => s.name) : result.error;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ShopsProvider", () => {
  it("carrega as lojas salvas", () => {
    const storage = memoryStorage();
    saveShops(storage, [makeShop({ name: "Loja A" })], testDeps());
    renderProbe(storage);
    expect(screen.getByText("carregado")).toBeInTheDocument();
    expect(screen.getByText("Loja A")).toBeInTheDocument();
  });

  it("grava 500 ms depois da última mudança", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS - 1));
    expect(savedNames(storage)).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(savedNames(storage)).toEqual(["Loja Nova"]);
  });

  it("carimba updatedAt com o relógio injetado", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS));
    const result = loadShops(storage);
    expect(result.ok && result.value[0].updatedAt).toBe("2026-09-22T12:00:00.000Z");
  });

  it("cria snapshot automático ao gravar", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS));
    expect(listSnapshots(storage)).toHaveLength(1);
  });

  it("grava na hora quando a página é escondida", () => {
    const storage = memoryStorage();
    renderProbe(storage);
    fireEvent.click(screen.getByText("criar"));
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(savedNames(storage)).toEqual(["Loja Nova"]);
  });

  it("acusa dados corrompidos e não os sobrescreve", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.setItem(SHOPS_KEY, "{lixo");
    renderProbe(storage);
    expect(screen.getByTestId("error")).toHaveTextContent("corrupt");
    fireEvent.click(screen.getByText("criar"));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 2));
    expect(storage.getItem(SHOPS_KEY)).toBe("{lixo");
  });

  it("acusa storage indisponível e continua funcionando em memória", () => {
    renderProbe(null);
    expect(screen.getByTestId("error")).toHaveTextContent("unavailable");
    fireEvent.click(screen.getByText("criar"));
    expect(screen.getByText("Loja Nova")).toBeInTheDocument();
  });
});
