import { RARITY_LABEL, RARITY_SHORT } from "@/lib/labels";
import type { Rarity } from "@/lib/types";

export function RaritySeal({ rarity, short = false }: { rarity: Rarity; short?: boolean }) {
  return (
    <span className={`seal seal-${rarity}`} title={RARITY_LABEL[rarity]}>
      {short ? RARITY_SHORT[rarity] : RARITY_LABEL[rarity]}
    </span>
  );
}
