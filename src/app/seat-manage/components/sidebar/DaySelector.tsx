import { cn } from "@/lib/utils";
import { DAY_LABELS } from "../../constants";
import type { DayKey } from "@/types/seating";

const DAYS = ['base', 'thu', 'fri', 'sat', 'sun'] as const;

interface DaySelectorProps {
  selectedDay: 'base' | DayKey;
  onSelect: (day: 'base' | DayKey) => void;
}

export default function DaySelector({ selectedDay, onSelect }: DaySelectorProps) {
  return (
    <div>
      <span className="font-display text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/40 block mb-1.5">
        배치 회차
      </span>
      <div className="flex border border-foreground">
        {DAYS.map((d, i) => (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={cn(
              "flex-1 font-display font-bold text-[10px] py-1.5 tracking-wider transition-colors",
              i > 0 && "border-l border-foreground",
              selectedDay === d
                ? "bg-foreground text-background"
                : "hover:bg-foreground/10",
            )}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  );
}
