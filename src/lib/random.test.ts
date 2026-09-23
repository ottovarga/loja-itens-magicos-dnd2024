import { describe, expect, it } from "vitest";
import { mulberry32, pickOne, pickWeighted, randomInt } from "./random";
import { seq } from "./__fixtures__/rng";

describe("mulberry32", () => {
  it("gera a mesma sequência para a mesma seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gera valores em [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("devolve o mínimo quando o rng devolve 0", () => {
    expect(randomInt(seq(0), 2, 5)).toBe(2);
  });

  it("devolve o máximo quando o rng devolve quase 1", () => {
    expect(randomInt(seq(0.9999), 2, 5)).toBe(5);
  });
});

describe("pickOne", () => {
  it("escolhe pelo índice proporcional ao rng", () => {
    expect(pickOne(seq(0.5), ["a", "b", "c", "d"])).toBe("c");
  });

  it("lança erro com lista vazia", () => {
    expect(() => pickOne(seq(0), [])).toThrow();
  });
});

describe("pickWeighted", () => {
  it("respeita os pesos", () => {
    const entries = [
      ["a", 1],
      ["b", 3],
    ] as const;
    expect(pickWeighted(seq(0.2), entries)).toBe("a");
    expect(pickWeighted(seq(0.3), entries)).toBe("b");
  });

  it("nunca escolhe peso zero", () => {
    const entries = [
      ["a", 0],
      ["b", 1],
    ] as const;
    expect(pickWeighted(seq(0), entries)).toBe("b");
  });
});
