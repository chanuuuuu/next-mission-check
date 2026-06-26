"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FLOORS,
  type FloorDef,
  type SectionDef,
} from "../seat-manage/config/seatLayout";
import { isSeatDisabled } from "../seat-manage/config/seatScores";
import { computeTeamColors } from "../seat-manage/config/teamColors";
import type { Team } from "@/types/seating";

interface Props {
  teams: Team[];
  assignments: Record<string, number>;
}

type FloorTab = "1F" | "2F";

interface SeatGroup {
  floor: FloorTab;
  sectionId: string;
  sectionLabel: string;
  rowIndices: number[];
}

function locateTeam(
  assignments: Record<string, number>,
  teamId: number,
): SeatGroup[] {
  const groups: Record<string, SeatGroup> = {};
  for (const [key, tid] of Object.entries(assignments)) {
    if (tid !== teamId) continue;
    // key format: "1F_A_R3_C5"
    const [floorId, block, rowPart] = key.split("_");
    const rowIdx = parseInt(rowPart.slice(1)) - 1;
    const groupKey = `${floorId}_${block}`;
    const sectionId = `${floorId}-${block}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        floor: floorId as FloorTab,
        sectionId,
        sectionLabel: block,
        rowIndices: [rowIdx],
      };
    } else if (!groups[groupKey].rowIndices.includes(rowIdx)) {
      groups[groupKey].rowIndices.push(rowIdx);
    }
  }
  return Object.values(groups)
    .sort((a, b) =>
      a.floor !== b.floor
        ? a.floor.localeCompare(b.floor)
        : a.sectionId.localeCompare(b.sectionId),
    )
    .map((g) => ({ ...g, rowIndices: g.rowIndices.sort((a, b) => a - b) }));
}

export default function ViewClient({ teams, assignments }: Props) {
  const [query, setQuery] = useState("");
  const [floorTab, setFloorTab] = useState<FloorTab>("1F");

  const teamColorMap = useMemo(
    () => computeTeamColors(assignments),
    [assignments],
  );

  const matchedTeam = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return teams.find((t) => t.church_name.includes(q)) ?? null;
  }, [query, teams]);

  const located = useMemo(
    () => (matchedTeam ? locateTeam(assignments, matchedTeam.id) : []),
    [matchedTeam, assignments],
  );

  const primaryFloor = located[0]?.floor ?? "1F";

  useEffect(() => {
    if (matchedTeam && located.length > 0) setFloorTab(primaryFloor);
  }, [matchedTeam, primaryFloor, located.length]);

  useEffect(() => {
    if (!matchedTeam) return;
    const t = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>(
        `[data-team-highlight="${matchedTeam.id}"]`,
      );
      if (!els.length) return;

      // Compute bounding box of all highlighted seats
      let minLeft = Infinity,
        maxRight = -Infinity,
        minTop = Infinity,
        maxBottom = -Infinity;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        minLeft = Math.min(minLeft, r.left);
        maxRight = Math.max(maxRight, r.right);
        minTop = Math.min(minTop, r.top);
        maxBottom = Math.max(maxBottom, r.bottom);
      });

      const blockCenterX = (minLeft + maxRight) / 2;
      const blockCenterY = (minTop + maxBottom) / 2;

      // Vertical: center the block vertically in the viewport
      const targetScrollY =
        window.scrollY + blockCenterY - window.innerHeight / 2;
      window.scrollTo({ top: Math.max(0, targetScrollY), behavior: "smooth" });

      // Horizontal: center block in viewport via container scroll
      // containerRect.left cancels in the math: targetLeft = scrollLeft + blockCenterX - innerWidth/2
      const container = els[0].closest<HTMLElement>(".overflow-x-auto");
      if (container) {
        const targetLeft =
          container.scrollLeft + blockCenterX - window.innerWidth / 2;
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: "smooth",
        });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [matchedTeam, floorTab]);

  const highlightTeamId = matchedTeam?.id ?? null;
  const totalSeats = matchedTeam
    ? Object.values(assignments).filter((tid) => tid === matchedTeam.id).length
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="border-b border-foreground px-4 py-4 sticky top-0 bg-background z-10">
        <span className="font-display text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/50 block">
          Seating
        </span>
        <h1 className="font-display text-base font-bold tracking-tight">
          내 좌석 찾기
        </h1>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder="교회명 검색 (예: 성덕교회)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 h-12 border border-foreground bg-background font-body text-base placeholder:text-foreground/40 focus:outline-none focus:border-foreground"
            style={{ fontSize: "16px" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
              aria-label="지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Empty state */}
        {!query && (
          <div className="border border-foreground p-5 text-center space-y-2">
            <MapPin className="h-6 w-6 mx-auto text-foreground/40" />
            <p className="text-sm text-foreground/60">
              교회명을 입력하면 해당 좌석 위치가 표시됩니다.
            </p>
          </div>
        )}

        {/* No match */}
        {query && !matchedTeam && (
          <div className="border border-foreground p-5 text-center text-sm text-foreground/60">
            검색 결과가 없습니다.
          </div>
        )}

        {/* No assignments */}
        {matchedTeam && located.length === 0 && (
          <div className="border border-foreground p-5 text-center text-sm text-foreground/60">
            배정된 좌석이 없습니다.
          </div>
        )}

        {/* Seat info card */}
        {matchedTeam && located.length > 0 && (
          <div className="border border-foreground">
            <div
              className="px-4 py-3 border-b border-foreground flex items-center gap-3"
              style={{ background: teamColorMap.get(matchedTeam.id) }}
            >
              <span className="font-display text-lg font-bold">
                {matchedTeam.church_name}
              </span>
              {matchedTeam.team_name && (
                <span className="font-display text-sm text-foreground/70">
                  {matchedTeam.team_name}
                </span>
              )}
              <span className="ml-auto font-display font-bold text-sm border border-foreground/60 bg-background px-2 py-0.5">
                {totalSeats}석
              </span>
            </div>
            <ul className="divide-y divide-foreground">
              {located.map((g) => (
                <li
                  key={g.sectionId}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <span className="bg-foreground text-background font-display font-bold text-[10px] px-2 py-1 tracking-[0.2em] shrink-0">
                    {g.floor}
                  </span>
                  <span className="font-display font-bold text-sm">
                    {g.sectionLabel}구역 ·{" "}
                    {g.rowIndices.map((r) => `${r + 1}열`).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Floor tabs */}
        <div>
          <div className="grid grid-cols-2 border border-foreground mb-4">
            {(["1F", "2F"] as FloorTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFloorTab(f)}
                className={cn(
                  "font-display font-bold text-sm py-2 tracking-wider transition-colors",
                  floorTab === f
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-foreground/10",
                  f === "2F" && "border-l border-foreground",
                )}
              >
                {f === "1F" ? "1층" : "2층"}
              </button>
            ))}
          </div>

          {FLOORS.filter((floor) => floor.id === floorTab).map((floor) => (
            <MobileFloorView
              key={floor.id}
              floor={floor}
              assignments={assignments}
              highlightTeamId={highlightTeamId}
              teamColorMap={teamColorMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileFloorView({
  floor,
  assignments,
  highlightTeamId,
  teamColorMap,
}: {
  floor: FloorDef;
  assignments: Record<string, number>;
  highlightTeamId: number | null;
  teamColorMap: Map<number, string>;
}) {
  return (
    <div>
      <div className="bg-foreground text-background text-center font-display text-[9px] font-bold tracking-[0.4em] py-1.5 mb-1">
        STAGE · 강대상
      </div>
      <div className="overflow-x-auto">
        <div
          className={cn(
            "border-x border-b border-foreground p-2 inline-block min-w-full",
            floor.id === "1F" && "rounded-b-[30%_15%]",
          )}
        >
          <div className="flex gap-2 justify-start items-start">
            {floor.sections.map((section, idx) => (
              <div key={section.id} className="flex gap-2 items-start shrink-0">
                <MobileSectionView
                  section={section}
                  floorId={floor.id}
                  assignments={assignments}
                  highlightTeamId={highlightTeamId}
                  teamColorMap={teamColorMap}
                />
                {idx < floor.sections.length - 1 && (
                  <div className="w-px self-stretch border-l border-dashed border-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CELL = 18;

function MobileSectionView({
  section,
  floorId,
  assignments,
  highlightTeamId,
  teamColorMap,
}: {
  section: SectionDef;
  floorId: "1F" | "2F";
  assignments: Record<string, number>;
  highlightTeamId: number | null;
  teamColorMap: Map<number, string>;
}) {
  const block = section.id.split("-")[1];
  const maxCols = Math.max(...section.rows.map((r) => r.count));

  return (
    <div className="flex flex-col items-center shrink-0">
      <span className="font-display text-[10px] font-bold tracking-widest text-foreground/50 mb-1">
        {section.label}
      </span>
      <div className="flex flex-col gap-[3px]">
        {section.rows.map((row, rIdx) => {
          const leftPad = Math.floor((maxCols - row.count) / 2);
          return (
            <div key={rIdx} className="flex gap-[3px] items-center">
              <span className="font-display text-[9px] text-foreground/40 w-4 text-right tabular-nums shrink-0">
                {rIdx + 1}
              </span>
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${maxCols}, ${CELL}px)` }}
              >
                {Array.from({ length: maxCols }).map((_, cIdx) => {
                  const inRow = cIdx >= leftPad && cIdx < leftPad + row.count;
                  if (!inRow)
                    return (
                      <span key={cIdx} style={{ width: CELL, height: CELL }} />
                    );
                  const key = `${floorId}_${block}_R${rIdx + 1}_C${cIdx - leftPad + 1}`;
                  const disabled = isSeatDisabled(key);
                  const teamId = assignments[key];
                  const isHighlight =
                    highlightTeamId !== null && teamId === highlightTeamId;
                  const dimmed = highlightTeamId !== null && !isHighlight;
                  const bg = disabled
                    ? "oklch(0.85 0 0)"
                    : teamColorMap.get(teamId);
                  return (
                    <span
                      key={cIdx}
                      data-team-highlight={isHighlight ? teamId : undefined}
                      className={cn(
                        "border border-foreground/40 transition-opacity",
                        dimmed && "opacity-15",
                        isHighlight && "ring-2 ring-foreground ring-offset-0",
                      )}
                      style={{
                        background: bg,
                        width: CELL,
                        height: CELL,
                        display: "block",
                      }}
                    />
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
