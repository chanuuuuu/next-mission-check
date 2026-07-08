"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { AccommodationBuilding } from "@/types";

interface Props {
  churchName: string;
  buildings: AccommodationBuilding[];
  backHref: string;
  backLabel: string;
  highlightBuilding?: string;
  highlightRoom?: number;
}

function countRealPeople(names: string[]) {
  return names.filter((name) => !name.startsWith("타팀")).length;
}

export function AccommodationClient({
  churchName,
  buildings,
  backHref,
  backLabel,
  highlightBuilding,
  highlightRoom,
}: Props) {
  const totalPeople = buildings.reduce(
    (sum, b) =>
      sum + b.rooms.reduce((rs, r) => rs + countRealPeople(r.names), 0),
    0,
  );

  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">
        <header className="border-b border-foreground px-6 pt-6 pb-5 shrink-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-0.5 font-display text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {backLabel}
          </Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight truncate">
              {churchName}
            </h1>
            <div className="flex shrink-0 items-center gap-1.5 border border-foreground px-3 py-1.5 font-display">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                인원
              </span>
              <span className="text-base font-bold tabular-nums">
                {totalPeople}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 pb-8">
          {buildings.length === 0 ? (
            <p className="text-center py-16 text-sm text-muted-foreground">
              해당 교회의 숙소 배정 정보가 없습니다.
            </p>
          ) : (
            buildings.map((b) => (
              <BuildingBlock
                key={b.building}
                building={b}
                highlightBuilding={highlightBuilding}
                highlightRoom={highlightRoom}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BuildingBlock({
  building,
  highlightBuilding,
  highlightRoom,
}: {
  building: AccommodationBuilding;
  highlightBuilding?: string;
  highlightRoom?: number;
}) {
  const totalPeople = building.rooms.reduce(
    (s, r) => s + countRealPeople(r.names),
    0,
  );

  const selfRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    selfRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between border-b border-foreground pb-1.5">
        <span className="font-display font-bold text-lg">
          {building.building}
        </span>
        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground tabular-nums">
          {building.rooms.length}room · {totalPeople}p
        </span>
      </div>

      <ul className="space-y-2.5">
        {building.rooms.map((r) => {
          const isSelf =
            building.building === highlightBuilding && r.room === highlightRoom;
          return (
          <li
            key={r.room}
            ref={isSelf ? selfRef : undefined}
            className={
              isSelf
                ? "border-4 border-brand scale-[1.04] relative z-10 shadow-[0_4px_16px] shadow-brand/25"
                : "border border-foreground"
            }
          >
            <div className="flex items-center justify-between bg-brand text-white px-3 py-1.5">
              <span className="font-display text-xl font-bold tabular-nums tracking-wider">
                {r.room}
              </span>
              <span className="inline-flex items-center gap-1 font-display text-[11px] tracking-widest uppercase opacity-90">
                <Users className="h-3 w-3" />
                <span className="tabular-nums">{countRealPeople(r.names)}</span>
              </span>
            </div>
            <ol className="divide-y divide-foreground/15 border-t border-foreground">
              {[...r.names]
                .sort(
                  (a, b) =>
                    Number(a.startsWith("타팀")) - Number(b.startsWith("타팀")),
                )
                .map((name, i) => {
                  const isPlaceholder = name.startsWith("타팀");
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 ${isPlaceholder ? "bg-muted/40" : ""}`}
                    >
                      <span className="font-display text-[10px] tracking-widest text-muted-foreground tabular-nums w-4">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[15px] truncate flex-1 ${
                          isPlaceholder
                            ? "italic text-muted-foreground"
                            : "font-medium"
                        }`}
                      >
                        {name}
                      </span>
                    </li>
                  );
                })}
            </ol>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
