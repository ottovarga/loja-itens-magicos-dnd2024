import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ShopsProvider, type AppDeps } from "@/components/ShopsProvider";
import { mulberry32 } from "@/lib/random";
import { saveShops } from "@/lib/storage";
import type { Shop } from "@/lib/types";
import { makeDeps } from "@/lib/__fixtures__/deps";
import { memoryStorage } from "@/lib/__fixtures__/memoryStorage";

export function testDeps(): AppDeps {
  const deps = makeDeps("2026-09-22T12:00:00.000Z");
  return { now: deps.now, newId: deps.newId, rng: mulberry32(1) };
}

interface Options {
  shops?: Shop[];
  storage?: Storage;
  deps?: AppDeps;
}

/** Grava `shops` no storage falso e renderiza `ui` dentro do ShopsProvider. */
export function renderWithShops(
  ui: ReactElement,
  { shops = [], storage = memoryStorage(), deps = testDeps() }: Options = {},
) {
  saveShops(storage, shops, deps);
  const result = render(
    <ShopsProvider storage={storage} deps={deps}>
      {ui}
    </ShopsProvider>,
  );
  return { ...result, storage, deps };
}
