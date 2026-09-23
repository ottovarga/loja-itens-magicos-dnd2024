import { TYPE_LABEL } from "@/lib/labels";
import type { ItemType } from "@/lib/types";

const PATHS: Record<ItemType, string[]> = {
  armor: ["M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z", "M12 3v18", "M5 11h14"],
  potion: [
    "M9.5 3h5",
    "M10.5 3v5L6 16a4 4 0 0 0 3.5 5h5a4 4 0 0 0 3.5-5L13.5 8V3",
    "M7.5 14h9",
  ],
  ring: ["M18 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0z", "M9.5 5.5 12 3l2.5 2.5L12 8z"],
  rod: ["M5 19 16 8", "M14.5 5.5l4 4", "M16 8l2.5-2.5", "M3.5 20.5 5 19"],
  scroll: [
    "M7 4h11a2 2 0 0 1 0 4H7",
    "M7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4H9",
    "M10 11h6",
    "M10 14h4",
  ],
  staff: ["M12 21V9", "M14.5 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z", "M10 21h4"],
  wand: ["M4 20 15 9", "M17 3v4", "M15 5h4", "M20 10v2", "M19 11h2"],
  weapon: ["M20 4 9 15", "M20 4h-4", "M20 4v4", "M7 13l4 4", "M8 16l-4 4"],
  wondrous: ["M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.4 7 18.2l1.2-5.6L4 8.8l5.6-.6z"],
};

export function TypeIcon({ type, className }: { type: ItemType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={TYPE_LABEL[type]}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[type].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
