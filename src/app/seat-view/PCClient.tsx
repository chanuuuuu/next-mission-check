"use client";

import { useMemo, Fragment } from "react";
import Link from "next/link";
import { FLOORS, type FloorDef, type SectionDef } from "../seat-manage/config/seatLayout";
import { isSeatDisabled } from "../seat-manage/config/seatScores";
import { computeTeamColors } from "../seat-manage/config/teamColors";
import type { Team } from "@/types/seating";

const CELL = 14;

interface Props {
  teams: Team[];
  assignments: Record<string, number>;
}

export default function PCClient({ teams, assignments }: Props) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamColorMap = useMemo(() => computeTeamColors(assignments), [assignments]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground px-6 py-3 flex items-center gap-4">
        <Link
          href="/seat-manage"
          className="font-display text-xs font-bold text-foreground/50 hover:text-foreground transition-colors"
        >
          ← 관리자
        </Link>
        <h1 className="font-display text-lg font-bold tracking-tight">
          좌석 배치 현황 · PC뷰
        </h1>
        <span className="ml-auto font-display text-[10px] text-foreground/40 tracking-widest uppercase">
          {Object.keys(assignments).length}석 배정
        </span>
      </header>

      <div className="p-4 grid grid-cols-2 gap-6">
        {FLOORS.map((floor) => (
          <PCFloorView
            key={floor.id}
            floor={floor}
            assignments={assignments}
            teamMap={teamMap}
            teamColorMap={teamColorMap}
          />
        ))}
      </div>
    </div>
  );
}

function PCFloorView({
  floor,
  assignments,
  teamMap,
  teamColorMap,
}: {
  floor: FloorDef;
  assignments: Record<string, number>;
  teamMap: Map<number, Team>;
  teamColorMap: Map<number, string>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-foreground text-background font-display font-bold text-xs px-2 py-0.5 tracking-[0.2em]">
          {floor.id}
        </span>
        <h2 className="font-display text-sm font-bold">{floor.label}</h2>
      </div>

      <div className="bg-foreground text-background text-center font-display text-[8px] font-bold tracking-[0.4em] py-1 mb-0.5">
        STAGE · 강대상
      </div>

      <div
        className={`border-x border-b border-foreground p-2 ${
          floor.id === "1F" ? "rounded-b-[40%_20%]" : ""
        }`}
      >
        <div className="flex gap-2 justify-center items-start">
          {floor.sections.map((section, idx) => (
            <Fragment key={section.id}>
              <PCSectionView
                section={section}
                floorId={floor.id}
                assignments={assignments}
                teamMap={teamMap}
                teamColorMap={teamColorMap}
              />
              {idx < floor.sections.length - 1 && (
                <div className="w-px self-stretch border-l border-dashed border-foreground/30 shrink-0" />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function PCSectionView({
  section,
  floorId,
  assignments,
  teamMap,
  teamColorMap,
}: {
  section: SectionDef;
  floorId: "1F" | "2F";
  assignments: Record<string, number>;
  teamMap: Map<number, Team>;
  teamColorMap: Map<number, string>;
}) {
  const block = section.id.split("-")[1];
  const maxCols = Math.max(...section.rows.map((r) => r.count));
  const sectionWidth = maxCols * (CELL + 2) - 2;

  return (
    <div className="flex flex-col items-center shrink-0">
      <span className="font-display text-[9px] font-bold tracking-widest text-foreground/50 mb-1">
        {section.label}
      </span>
      <div className="flex flex-col gap-[2px]">
        {section.rows.map((row, rIdx) => {
          const leftPad = Math.floor((maxCols - row.count) / 2);
          const key1 = `${floorId}_${block}_R${rIdx + 1}_C1`;
          const rowTeamId = assignments[key1];
          const prevKey = `${floorId}_${block}_R${rIdx}_C1`;
          const prevTeamId = rIdx > 0 ? assignments[prevKey] : undefined;
          const isTeamStart = !!rowTeamId && rowTeamId !== prevTeamId;
          const rowTeam = isTeamStart ? teamMap.get(rowTeamId) : undefined;

          return (
            <Fragment key={rIdx}>
              {isTeamStart && rowTeam && (
                <div
                  className="font-display font-bold text-[11px] leading-none py-[3px] px-1.5 truncate"
                  style={{
                    width: sectionWidth,
                    background: teamColorMap.get(rowTeamId),
                    color: "rgba(0,0,0,0.75)",
                  }}
                >
                  {rowTeam.church_name}
                </div>
              )}
              <div className="flex gap-[2px] items-center">
                <span
                  className="font-display text-[8px] text-foreground/40 shrink-0 tabular-nums text-right"
                  style={{ width: 14 }}
                >
                  {rIdx + 1}
                </span>
                <div
                  className="grid gap-[2px]"
                  style={{
                    gridTemplateColumns: `repeat(${maxCols}, ${CELL}px)`,
                  }}
                >
                  {Array.from({ length: maxCols }).map((_, cIdx) => {
                    const inRow = cIdx >= leftPad && cIdx < leftPad + row.count;
                    if (!inRow)
                      return (
                        <span
                          key={cIdx}
                          style={{ width: CELL, height: CELL }}
                        />
                      );
                    const seatKey = `${floorId}_${block}_R${rIdx + 1}_C${cIdx - leftPad + 1}`;
                    const disabled = isSeatDisabled(seatKey);
                    const teamId = assignments[seatKey];
                    const bg = disabled
                      ? "oklch(0.85 0 0)"
                      : teamColorMap.get(teamId);
                    return (
                      <span
                        key={cIdx}
                        className="border border-foreground/40"
                        style={{
                          display: "block",
                          width: CELL,
                          height: CELL,
                          background: bg,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
