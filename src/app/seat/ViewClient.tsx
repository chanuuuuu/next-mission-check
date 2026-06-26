"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useTeamSearch } from "./hooks/useTeamSearch";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { SearchInput } from "./components/SearchInput";
import { SeatInfoCard } from "./components/SeatInfoCard";
import { FloorTabView } from "./components/FloorTabView";
import type { Team } from "@/types/seating";

interface Props {
  teams: Team[];
  assignments: Record<string, number>;
  teamToJinId?: Record<number, number>;
}

export default function ViewClient({ teams, assignments, teamToJinId }: Props) {
  const {
    query,
    setQuery,
    floorTab,
    setFloorTab,
    matchedTeam,
    effectiveId,
    located,
    totalSeats,
    teamColorMap,
  } = useTeamSearch({ teams, assignments, teamToJinId });

  useAutoScroll(effectiveId, matchedTeam?.id ?? null, floorTab);

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
        <SearchInput
          query={query}
          onChange={setQuery}
          onClear={() => setQuery("")}
        />

        {!query && (
          <div className="border border-foreground p-5 text-center space-y-2">
            <MapPin className="h-6 w-6 mx-auto text-foreground/40" />
            <p className="text-sm text-foreground/60">
              교회명을 입력하면 해당 좌석 위치가 표시됩니다.
            </p>
          </div>
        )}

        {query && !matchedTeam && (
          <div className="border border-foreground p-5 text-center text-sm text-foreground/60">
            검색 결과가 없습니다.
          </div>
        )}

        {matchedTeam && located.length === 0 && (
          <div className="border border-foreground p-5 text-center text-sm text-foreground/60">
            배정된 좌석이 없습니다.
          </div>
        )}

        {matchedTeam && located.length > 0 && effectiveId !== null && (
          <SeatInfoCard
            matchedTeam={matchedTeam}
            located={located}
            effectiveId={effectiveId}
            teamColorMap={teamColorMap}
            totalSeats={totalSeats}
            teamToJinId={teamToJinId}
          />
        )}

        <FloorTabView
          floorTab={floorTab}
          onTabChange={setFloorTab}
          assignments={assignments}
          highlightTeamId={effectiveId}
          teamColorMap={teamColorMap}
        />
      </div>
    </div>
  );
}
