"use client";

import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import {
  FLOORS,
  type FloorDef,
  type SectionDef,
} from "../seat-manage/config/seatLayout";
import { isSeatDisabled } from "../seat-manage/config/seatScores";
import { computeTeamColors } from "../seat-manage/config/teamColors";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/seating";

const CELL = 20;
const GAP = 3;
const ROW = CELL + GAP;
const SWITCH_MS = 60_000;

interface Props {
  teams: Team[];
  assignments: Record<string, number>;
}

export default function PCClient({ teams, assignments }: Props) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamColorMap = useMemo(
    () => computeTeamColors(assignments),
    [assignments],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const scaleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Auto-switch every SWITCH_MS
  useEffect(() => {
    const t = setInterval(
      () => setActiveIdx((p) => (p + 1) % FLOORS.length),
      SWITCH_MS,
    );
    return () => clearInterval(t);
  }, []);

  // Scale content to fill the viewport (runs before paint — no flash)
  useLayoutEffect(() => {
    const el = scaleRef.current;
    const header = headerRef.current;
    if (!el || !header) return;

    const apply = () => {
      // offsetWidth/Height are unaffected by transform — always return natural box size
      const nw = el.offsetWidth;
      const nh = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight - header.offsetHeight;
      // Leave 80px breathing room on each side horizontally
      const s = Math.min((vw - 160) / nw, (vh - 40) / nh);
      el.style.transform = `scale(${s})`;
    };

    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [activeIdx]);

  const floor = FLOORS[activeIdx];

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header ref={headerRef} className="border-b border-foreground shrink-0">
        <div className="px-6 py-3 flex items-center gap-4">
          <Link
            href="/seat-manage"
            className="font-display text-xs font-bold text-foreground/50 hover:text-foreground transition-colors"
          >
            ← 관리자
          </Link>
          <h1 className="font-display text-lg font-bold tracking-tight">
            좌석 배치 현황
          </h1>
          <div className="flex gap-2 ml-2">
            {FLOORS.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "font-display text-xs font-bold px-2.5 py-1 transition-colors",
                  i === activeIdx
                    ? "bg-foreground text-background"
                    : "border border-foreground/30 text-foreground/40 hover:text-foreground hover:border-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="ml-auto font-display text-[10px] text-foreground/40 tracking-widest uppercase">
            {Object.keys(assignments).length}석 배정
          </span>
        </div>

        {/* Countdown progress bar — resets on each floor switch */}
        <div className="h-0.5 bg-foreground/10 relative overflow-hidden">
          <div
            key={activeIdx}
            className="absolute inset-y-0 left-0 bg-foreground/60"
            style={{
              animation: `progress-shrink ${SWITCH_MS}ms linear forwards`,
            }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex items-start justify-center">
        <div
          ref={scaleRef}
          key={activeIdx}
          className="animate-[var(--animate-fade-in)]"
          style={{ transformOrigin: "top center" }}
        >
          <ViewFloorView
            floor={floor}
            assignments={assignments}
            teamMap={teamMap}
            teamColorMap={teamColorMap}
          />
        </div>
      </div>
    </div>
  );
}

function ViewFloorView({
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
      <div className="flex items-center gap-3 mb-4 px-6 pt-4">
        <span className="bg-foreground text-background font-display font-bold text-xs px-2 py-1 tracking-[0.2em]">
          {floor.id}
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight">
          {floor.label}
        </h2>
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
              <ViewSectionView
                section={section}
                floorId={floor.id}
                assignments={assignments}
                teamMap={teamMap}
                teamColorMap={teamColorMap}
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

function ViewSectionView({
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

  // Group consecutive rows by team for centered name labels
  const teamGroups = useMemo(() => {
    const groups: { teamId: number; start: number; end: number }[] = [];
    let curTeamId: number | undefined;
    let groupStart = 0;
    for (let r = 0; r < section.rows.length; r++) {
      const teamId = assignments[`${floorId}_${block}_R${r + 1}_C1`];
      if (r === 0) {
        curTeamId = teamId;
        groupStart = 0;
      } else if (teamId !== curTeamId) {
        if (curTeamId !== undefined)
          groups.push({ teamId: curTeamId, start: groupStart, end: r - 1 });
        curTeamId = teamId;
        groupStart = r;
      }
    }
    if (curTeamId !== undefined)
      groups.push({
        teamId: curTeamId,
        start: groupStart,
        end: section.rows.length - 1,
      });
    return groups.filter((g) => !!g.teamId);
  }, [section, assignments, floorId, block]);

  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50 mb-2">
        {section.label}
      </span>
      <div className="relative">
        {/* Team/jin name labels centered within each assigned block.
            Left offset skips the row-number column (w-4=16px + gap=3px = 19px). */}
        {teamGroups.map((g) => {
          const team = teamMap.get(g.teamId);
          if (!team) return null;
          const n = g.end - g.start + 1;
          const rowLabel =
            g.start === g.end
              ? `${g.start + 1}열`
              : `${g.start + 1}-${g.end + 1}열`;
          const placement = `${section.label}분단 ${rowLabel}`;
          return (
            <div
              key={`${g.teamId}_${g.start}`}
              className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
              style={{
                left: 19,
                right: 0,
                top: g.start * ROW,
                height: n * CELL + (n - 1) * GAP,
              }}
            >
              <span
                className="font-display font-bold text-xl text-foreground truncate px-1"
                style={{
                  textShadow:
                    "0 0 6px rgba(255,255,255,1), 0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.7)",
                }}
              >
                {team.church_name}
              </span>
              <span
                className="font-display font-bold text-sm text-foreground/70 truncate px-1"
                style={{
                  textShadow:
                    "0 0 6px rgba(255,255,255,1), 0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.7)",
                }}
              >
                {placement}
              </span>
            </div>
          );
        })}

        {/* Seat grid with row numbers (mirrors seat-manage style) */}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
