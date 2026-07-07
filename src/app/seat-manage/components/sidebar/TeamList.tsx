import { cn } from "@/lib/utils";
import type { Team } from "@/types/seating";

interface TeamListProps {
  teams: Team[];
  isDirtyHeadcount: boolean;
  onSaveHeadcounts: () => void;
  getEffectiveHeadcount: (team: Team) => number;
  onUpdateHeadcount: (teamId: number, val: number) => void;
  teamColorMap: Map<number, string>;
  seatCountMap: Map<number, number>;
  earnedScoreMap: Map<number, number>;
  highlightTeamId: number | null;
  onHighlight: (teamId: number) => void;
}

export default function TeamList({
  teams,
  isDirtyHeadcount,
  onSaveHeadcounts,
  getEffectiveHeadcount,
  onUpdateHeadcount,
  teamColorMap,
  seatCountMap,
  earnedScoreMap,
  highlightTeamId,
  onHighlight,
}: TeamListProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50">
          Teams · 누적점수순
        </span>
        {isDirtyHeadcount && (
          <button
            onClick={onSaveHeadcounts}
            className="text-[10px] font-display font-bold tracking-wider border border-foreground px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
          >
            인원 저장
          </button>
        )}
      </div>
      <div className="grid grid-cols-[12px_1fr_48px_28px_34px_34px] gap-2 px-1 mb-1 text-[9px] font-display tracking-wider uppercase text-foreground/50">
        <span />
        <span>교회</span>
        <span>인원</span>
        <span>배치</span>
        <span>획득</span>
        <span>누적</span>
      </div>
      <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
        {teams.map((t) => {
          const earned = earnedScoreMap.get(t.id);
          return (
            <div
              key={t.id}
              onClick={() => onHighlight(t.id)}
              className={cn(
                "grid grid-cols-[12px_1fr_48px_28px_34px_34px] gap-2 items-center cursor-pointer -mx-1 px-1 py-0.5 transition-colors",
                highlightTeamId === t.id
                  ? "bg-foreground/15 ring-1 ring-inset ring-foreground"
                  : "hover:bg-foreground/8",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 border border-foreground/50"
                style={{ background: teamColorMap.get(t.id) ?? "oklch(0.88 0 0)" }}
              />
              <div className="min-w-0">
                <div className="font-display text-xs font-bold truncate">
                  {t.church_name}
                </div>
                {t.team_name && (
                  <div className="text-[10px] text-foreground/50 truncate">
                    {t.team_name}
                  </div>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={60}
                value={getEffectiveHeadcount(t)}
                onChange={(e) => onUpdateHeadcount(t.id, parseInt(e.target.value) || 1)}
                className="w-full h-7 px-2 text-xs font-display border border-foreground/30 bg-background focus:border-foreground focus:outline-none text-right"
              />
              <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                {seatCountMap.get(t.id) ?? 0}
              </span>
              <span className="text-[10px] font-display tabular-nums text-right">
                {earned !== undefined ? earned.toFixed(1) : "–"}
              </span>
              <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                {Math.round(t.accumulated_score)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
