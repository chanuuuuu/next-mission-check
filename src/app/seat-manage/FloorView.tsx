import { memo } from "react";
import { cn } from "@/lib/utils";
import SectionView from "./SectionView";
import type { FloorDef } from "./config/seatLayout";
import type { Team } from "@/types/seating";

interface FloorViewProps {
  floor: FloorDef;
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

function FloorView({
  floor,
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
}: FloorViewProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-foreground text-background font-display font-bold text-xs px-2 py-1 tracking-[0.2em]">
          {floor.id}
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight">{floor.label}</h2>
      </div>

      <div className="mx-auto max-w-[60%] border border-foreground bg-foreground text-background text-center font-display text-[10px] font-bold tracking-[0.4em] py-2 mb-1">
        STAGE · 강대상
      </div>

      <div
        className={cn(
          "border-x border-b border-foreground p-3 md:p-6",
          floor.id === "1F" && "rounded-b-[40%_20%]",
        )}
      >
        <div className="flex gap-3 md:gap-6 justify-center items-start min-w-fit mx-auto">
          {floor.sections.map((section, idx) => (
            <div key={section.id} className="flex gap-3 md:gap-6 items-start">
              <SectionView
                section={section}
                floorId={floor.id}
                assignments={assignments}
                teamMap={teamMap}
                teamColorMap={teamColorMap}
                highlightTeamId={highlightTeamId}
                hoveredJinName={hoveredJinName}
                hasReadyJin={hasReadyJin}
                hoverPreview={hoverPreview}
                onRowClick={onRowClick}
                onRowHover={onRowHover}
                onRowLeave={onRowLeave}
              />
              {idx < floor.sections.length - 1 && (
                <div className="w-3 md:w-5 self-stretch flex items-center justify-center">
                  <div className="w-px h-full border-l border-dashed border-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(FloorView);
