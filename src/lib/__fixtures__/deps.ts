/** Relógio controlável e IDs previsíveis (`id-1`, `id-2`, ...). */
export function makeDeps(startIso = "2026-09-22T12:00:00.000Z") {
  let time = Date.parse(startIso);
  let n = 0;
  return {
    now: () => new Date(time),
    newId: () => `id-${++n}`,
    advance(ms: number) {
      time += ms;
    },
  };
}
