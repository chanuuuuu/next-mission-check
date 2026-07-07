import { useMemo } from "react";
import { FLOORS } from "../config/seatLayout";
import { isSeatDisabled } from "../config/seatScores";
import { computeTeamColors } from "../config/teamColors";
import type { Team, AlgoResult, JinUnit, JinAlgoResult } from "@/types/seating";

interface UseSeatDerivationsArgs {
  teams: Team[];
  mode: 'team' | 'jin';
  jinUnits: JinUnit[];
  assignments: Record<string, number>;
  algoResults: AlgoResult[];
  jinAlgoResults: JinAlgoResult[];
}

export function useSeatDerivations({
  teams,
  mode,
  jinUnits,
  assignments,
  algoResults,
  jinAlgoResults,
}: UseSeatDerivationsArgs) {
  // teamMap includes fake entries for jin syntheticIds so FloorView renders correctly
  const teamMap = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t]));
    if (mode === 'jin') {
      for (const u of jinUnits) {
        map.set(u.syntheticId, {
          id: u.syntheticId,
          church_id: -1,
          church_name: u.jinName,
          team_name: null,
          team_type: u.team_type,
          jin_name: u.jinName,
          headcount: u.headcount,
          accumulated_score: u.accumulated_score,
          headcount_thu: null,
          headcount_fri: null,
          headcount_sat: null,
          headcount_sun: null,
        });
      }
    }
    return map;
  }, [teams, mode, jinUnits]);

  const teamColorMap = useMemo(() => computeTeamColors(assignments), [assignments]);

  const seatCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const teamId of Object.values(assignments)) {
      map.set(teamId, (map.get(teamId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const earnedScoreMap = useMemo(
    () => new Map(algoResults.map((r) => [r.teamId, r.earnedScore])),
    [algoResults],
  );
  const jinEarnedScoreMap = useMemo(
    () => new Map(jinAlgoResults.map((r) => [r.syntheticId, r.earnedScore])),
    [jinAlgoResults],
  );

  const totalSeats = useMemo(() => {
    let n = 0;
    for (const floor of FLOORS) {
      for (const section of floor.sections) {
        const block = section.id.split("-")[1];
        for (let r = 0; r < section.rows.length; r++) {
          for (let c = 0; c < section.rows[r].count; c++) {
            if (!isSeatDisabled(`${floor.id}_${block}_R${r + 1}_C${c + 1}`)) n++;
          }
        }
      }
    }
    return n;
  }, []);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.accumulated_score - b.accumulated_score),
    [teams],
  );
  const sortedJinUnits = useMemo(
    () => [...jinUnits].sort((a, b) => a.accumulated_score - b.accumulated_score),
    [jinUnits],
  );

  return {
    teamMap,
    teamColorMap,
    seatCountMap,
    earnedScoreMap,
    jinEarnedScoreMap,
    totalSeats,
    sortedTeams,
    sortedJinUnits,
  };
}
