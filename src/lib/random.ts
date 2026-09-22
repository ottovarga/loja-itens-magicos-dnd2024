export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro em [min, max], limites inclusos. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickOne: lista vazia");
  return items[Math.floor(rng() * items.length)];
}

export function pickWeighted<T>(
  rng: Rng,
  entries: readonly (readonly [T, number])[],
): T {
  const positive = entries.filter(([, weight]) => weight > 0);
  const total = positive.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) throw new Error("pickWeighted: nenhum peso positivo");
  let r = rng() * total;
  for (const [value, weight] of positive) {
    if (r < weight) return value;
    r -= weight;
  }
  return positive[positive.length - 1][0];
}
