"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOORS } from "../seat-manage/config/seatLayout";
import { computeTeamColors } from "../seat-manage/config/teamColors";
import { MobileFloorView } from "./SeatGrid";
import type { Team } from "@/types/seating";

interface Props {
  teams: Team[];
  assignments: Record<string, number>;
  teamToJinId?: Record<number, number>;
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

export default function ViewClient({ teams, assignments, teamToJinId }: Props) {
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

  // In jin mode, resolve to the syntheticId of the matched team's jin
  const effectiveId = useMemo(() => {
    if (!matchedTeam) return null;
    if (teamToJinId && teamToJinId[matchedTeam.id] !== undefined) {
      return teamToJinId[matchedTeam.id];
    }
    return matchedTeam.id;
  }, [matchedTeam, teamToJinId]);

  const located = useMemo(
    () => (effectiveId !== null ? locateTeam(assignments, effectiveId) : []),
    [effectiveId, assignments],
  );

  const primaryFloor = located[0]?.floor ?? "1F";

  useEffect(() => {
    if (matchedTeam && located.length > 0) setFloorTab(primaryFloor);
  }, [matchedTeam, primaryFloor, located.length]);

  useEffect(() => {
    if (!matchedTeam || effectiveId === null) return;
    const t = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>(
        `[data-team-highlight="${effectiveId}"]`,
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
  }, [matchedTeam, effectiveId, floorTab]);

  const highlightTeamId = effectiveId;
  const totalSeats =
    effectiveId !== null
      ? Object.values(assignments).filter((tid) => tid === effectiveId).length
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="border-b border-foreground px-4 py-4 sticky top-0 bg-background z-10">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-tight text-foreground/50 hover:text-foreground transition-colors block mb-2"
        >
          ← 처음으로
        </Link>

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
        {matchedTeam && located.length > 0 && effectiveId !== null && (
          <div className="border border-foreground">
            <div
              className="px-4 py-3 border-b border-foreground flex items-center gap-3"
              style={{ background: teamColorMap.get(effectiveId) }}
            >
              <span className="font-display text-lg font-bold">
                {matchedTeam.church_name}
              </span>
              {teamToJinId?.[matchedTeam.id] !== undefined &&
              matchedTeam.jin_name ? (
                <span className="font-display text-sm border border-foreground/60 bg-background px-2 py-0.5">
                  {matchedTeam.jin_name}
                </span>
              ) : matchedTeam.team_name ? (
                <span className="font-display text-sm text-foreground/70">
                  {matchedTeam.team_name}
                </span>
              ) : null}
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
