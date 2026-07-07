import { memo } from "react";
import { cn } from "@/lib/utils";
import { getBaseScore, isSeatDisabled } from "./config/seatScores";
import type { SectionDef } from "./config/seatLayout";
import type { Team } from "@/types/seating";

interface SectionViewProps {
  section: SectionDef;
  floorId: "1F" | "2F";
  assignments: Record<string, number>;
  teamMap: Map<number, Team>;
  teamColorMap: Map<number, string>;
  highlightTeamId: number | null;
  hoveredJinName: string | null;
  hasReadyJin: boolean;
  hoverPreview: { seatKeys: Set<string>; feasible: boolean } | null;
  onRowClick: (sectionId: string, rowIdx: number) => void;
  onRowHover: (sectionId: string, rowIdx: number) => void;
  onRowLeave: () => void;
}

function SectionView({
  section,
  floorId,
  assignments,
  teamMap,
  teamColorMap,
  highlightTeamId,
  hoveredJinName,
  hasReadyJin,
  hoverPreview,
  onRowClick,
  onRowHover,
  onRowLeave,
}: SectionViewProps) {
  const block = section.id.split("-")[1];
  const maxCols = Math.max(...section.rows.map((r) => r.count));

  const activeRowNums = section.rows
    .map((_, r) => r)
    .filter((r) => !isSeatDisabled(`${floorId}_${block}_R${r + 1}_C1`));
  const activeCount = activeRowNums.length;

  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50 mb-2">
        {section.label}
      </span>
      <div className="flex flex-col gap-[3px]">
        {section.rows.map((row, rIdx) => {
          const leftPad = Math.floor((maxCols - row.count) / 2);
          const isActive = activeRowNums.includes(rIdx);
          const rowScore = isActive ? getBaseScore(floorId, rIdx, activeCount) : null;

          const rowTeamId = assignments[`${floorId}_${block}_R${rIdx + 1}_C1`];
          const prevRowTeamId =
            rIdx > 0 ? assignments[`${floorId}_${block}_R${rIdx}_C1`] : undefined;
          const isTeamStart = !!rowTeamId && rowTeamId !== prevRowTeamId;
          const rowTeam = isTeamStart ? teamMap.get(rowTeamId) : undefined;

          const isRowClickable = hasReadyJin && isActive;

          return (
            <div
              key={rIdx}
              className={cn("flex gap-[3px] items-center", isRowClickable && "cursor-pointer")}
              onClick={isRowClickable ? () => onRowClick(section.id, rIdx) : undefined}
              onMouseEnter={isRowClickable ? () => onRowHover(section.id, rIdx) : undefined}
              onMouseLeave={isRowClickable ? () => onRowLeave() : undefined}
            >
              <span className="font-display text-[9px] text-foreground/40 w-4 text-right tabular-nums shrink-0">
                {rIdx + 1}
              </span>
              <div
                className="grid gap-[3px] relative"
                style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
              >
                {isTeamStart && rowTeam && (
                  <div
                    className="absolute inset-0 z-10 flex items-center px-1 pointer-events-none font-display text-[9px] font-bold truncate text-foreground"
                    style={{ textShadow: "0 0 3px #fff, 0 0 3px #fff" }}
                  >
                    {rowTeam.church_name}
                  </div>
                )}
                {Array.from({ length: maxCols }).map((_, cIdx) => {
                  const inRow = cIdx >= leftPad && cIdx < leftPad + row.count;
                  if (!inRow) return <span key={cIdx} className="w-4 h-4 md:w-5 md:h-5" />;

                  const key = `${floorId}_${block}_R${rIdx + 1}_C${cIdx - leftPad + 1}`;
                  const disabled = isSeatDisabled(key);
                  const teamId = assignments[key];
                  const team = teamId ? teamMap.get(teamId) : undefined;
                  const isHighlight = highlightTeamId !== null && teamId === highlightTeamId;
                  const isDimmed = highlightTeamId !== null && !!teamId && !isHighlight;
                  const isJinHover = hoveredJinName !== null && !!team && team.jin_name === hoveredJinName;

                  const isInPreview = !disabled && (hoverPreview?.seatKeys.has(key) ?? false);
                  let bg: string | undefined;
                  if (disabled) {
                    bg = "oklch(0.85 0 0)";
                  } else if (isInPreview) {
                    bg = hoverPreview!.feasible
                      ? "oklch(0.7 0.18 60 / 85%)"   // orange preview
                      : "oklch(0.5 0.22 20 / 85%)";  // red preview (infeasible)
                  } else {
                    bg = teamColorMap.get(teamId);
                  }

                  return (
                    <div
                      key={cIdx}
                      title={
                        disabled
                          ? "POP 고정석"
                          : team
                            ? `${section.label}구역 ${rIdx + 1}열 · ${team.church_name}`
                            : `${section.label}구역 ${rIdx + 1}열`
                      }
                      className={cn(
                        "w-4 h-4 md:w-5 md:h-5 flex items-center justify-center transition-opacity",
                        isJinHover ? "border-2 border-foreground" : "border border-foreground/40",
                        isDimmed && "opacity-15",
                        isHighlight && "ring-2 ring-foreground ring-offset-0",
                      )}
                      style={{ background: bg }}
                    >
                      {!disabled && !isInPreview && rowScore !== null && (
                        <span className="text-[6px] md:text-[7px] font-display tabular-nums leading-none select-none pointer-events-none text-black/50">
                          {rowScore}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(SectionView);
