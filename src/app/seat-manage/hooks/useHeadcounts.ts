import { useMemo, useState } from "react";
import type { Team, DayKey } from "@/types/seating";
import type { Notice } from "../types";

export function useHeadcounts(initialTeams: Team[], notify: (n: Notice) => void) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [selectedDay, setSelectedDayState] = useState<'base' | DayKey>('base');
  const [isDirtyHeadcount, setIsDirtyHeadcount] = useState(false);

  function getEffectiveHeadcount(team: Team): number {
    if (selectedDay === 'base') return team.headcount;
    if (selectedDay === 'thu') return team.headcount_thu ?? team.headcount;
    if (selectedDay === 'fri') return team.headcount_fri ?? team.headcount;
    if (selectedDay === 'sat') return team.headcount_sat ?? team.headcount;
    return team.headcount_sun ?? team.headcount;
  }

  // Teams with effective headcount applied — used for algorithm and jin grouping.
  const effectiveTeams = useMemo(
    () => teams.map((t) => ({ ...t, headcount: getEffectiveHeadcount(t) })),
    [teams, selectedDay], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function selectDay(day: 'base' | DayKey) {
    setSelectedDayState(day);
    setIsDirtyHeadcount(false);
  }

  function updateHeadcount(teamId: number, val: number) {
    const v = Math.max(1, val);
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        if (selectedDay === 'base') return { ...t, headcount: v };
        if (selectedDay === 'thu') return { ...t, headcount_thu: v };
        if (selectedDay === 'fri') return { ...t, headcount_fri: v };
        if (selectedDay === 'sat') return { ...t, headcount_sat: v };
        return { ...t, headcount_sun: v };
      }),
    );
    setIsDirtyHeadcount(true);
  }

  async function saveHeadcounts() {
    const payload =
      selectedDay === 'base'
        ? teams.map((t) => ({ team_id: t.id, headcount: t.headcount }))
        : teams.map((t) => ({
            team_id: t.id,
            headcount: getEffectiveHeadcount(t),
            day: selectedDay,
          }));

    const res = await fetch("/api/teams/headcount", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setIsDirtyHeadcount(false);
      notify({ type: "ok", msg: "인원 저장 완료" });
    } else {
      notify({ type: "err", msg: "인원 저장 실패" });
    }
  }

  function applyScoreUpdates(updated: { id: number; accumulated_score: number }[]) {
    setTeams((prev) =>
      prev.map((t) => {
        const u = updated.find((x) => x.id === t.id);
        return u ? { ...t, accumulated_score: u.accumulated_score } : t;
      }),
    );
  }

  return {
    teams,
    setTeams,
    selectedDay,
    selectDay,
    effectiveTeams,
    getEffectiveHeadcount,
    updateHeadcount,
    saveHeadcounts,
    isDirtyHeadcount,
    applyScoreUpdates,
  };
}
