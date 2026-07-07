import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JinUnit, JinPlacementStatus } from "@/types/seating";

interface JinListProps {
  jinUnits: JinUnit[];
  jinStatuses: Map<string, JinPlacementStatus>;
  readyJin: string | null;
  seatCountMap: Map<number, number>;
  jinEarnedScoreMap: Map<number, number>;
  onJinClick: (unit: JinUnit) => void;
  onJinHover: (jinName: string | null) => void;
}

export default function JinList({
  jinUnits,
  jinStatuses,
  readyJin,
  seatCountMap,
  jinEarnedScoreMap,
  onJinClick,
  onJinHover,
}: JinListProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50">
          Jins · 누적점수순
        </span>
        {readyJin && (
          <span className="text-[9px] font-display text-amber-600 font-bold animate-pulse">
            행 클릭하여 배치
          </span>
        )}
      </div>
      <div className="grid grid-cols-[16px_1fr_40px_28px_34px_34px] gap-2 px-1 mb-1 text-[9px] font-display tracking-wider uppercase text-foreground/50">
        <span />
        <span>진</span>
        <span>인원</span>
        <span>배치</span>
        <span>획득</span>
        <span>누적</span>
      </div>
      <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
        {jinUnits.map((u) => {
          const earned = jinEarnedScoreMap.get(u.syntheticId);
          const status = jinStatuses.get(u.jinName) ?? 'unplaced';
          return (
            <div
              key={u.jinName}
              onClick={() => onJinClick(u)}
              onMouseEnter={() => onJinHover(u.jinName)}
              onMouseLeave={() => onJinHover(null)}
              className={cn(
                "grid grid-cols-[16px_1fr_40px_28px_34px_34px] gap-2 items-center cursor-pointer -mx-1 px-1 py-0.5 transition-colors",
                status === 'ready'
                  ? "bg-amber-50 ring-1 ring-inset ring-amber-400"
                  : "hover:bg-foreground/8",
              )}
            >
              {/* Status icon */}
              {status === 'placed' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
              ) : status === 'ready' ? (
                <Circle className="h-3.5 w-3.5 shrink-0 text-amber-500 animate-pulse" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-foreground/20" />
              )}
              <div className="min-w-0">
                <div className="font-display text-xs font-bold truncate">
                  {u.jinName}
                </div>
                <div className="text-[10px] text-foreground/50 truncate">
                  {u.memberTeamIds.length}교회
                  {status === 'ready' && (
                    <span className="ml-1 text-amber-600">배치 준비</span>
                  )}
                  {status === 'placed' && (
                    <span className="ml-1 text-green-600">배치완료</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-display tabular-nums text-right text-foreground/60">
                {u.headcount}
              </span>
              <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                {seatCountMap.get(u.syntheticId) ?? 0}
              </span>
              <span className="text-[10px] font-display tabular-nums text-right">
                {earned !== undefined ? earned.toFixed(1) : "–"}
              </span>
              <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                {Math.round(u.accumulated_score)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
