import type { Rng } from "../random";

/** Devolve os valores na ordem dada e recomeça do início quando acabam. */
export function seq(...values: number[]): Rng {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i++;
    return value;
  };
}
