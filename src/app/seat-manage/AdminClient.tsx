"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildJinUnits } from "./utils/jinGrouping";
import { FLOORS } from "./config/seatLayout";
import { useNotice } from "./hooks/useNotice";
import { useScoreOverrides } from "./hooks/useScoreOverrides";
import { useHeadcounts } from "./hooks/useHeadcounts";
import { useSeatDerivations } from "./hooks/useSeatDerivations";
import { useSeatPersistence } from "./hooks/useSeatPersistence";
import { usePlacement } from "./hooks/usePlacement";
import FloorView from "./FloorView";
import Toast from "./components/Toast";
import AdminHeader from "./components/AdminHeader";
import ModeToggle from "./components/sidebar/ModeToggle";
import DaySelector from "./components/sidebar/DaySelector";
import ActionBar from "./components/sidebar/ActionBar";
import TeamList from "./components/sidebar/TeamList";
import JinList from "./components/sidebar/JinList";
import OverridesPanel from "./components/sidebar/OverridesPanel";
import Legend from "./components/sidebar/Legend";
import type { Team } from "@/types/seating";

interface Props {
  initialTeams: Team[];
  savedAssignments: Record<string, number>;
  savedJinAssignments: Record<string, string>;
  savedMode: 'team' | 'jin';
}

export default function AdminClient({ initialTeams, savedAssignments, savedJinAssignments, savedMode }: Props) {
  const { notice, setNotice } = useNotice();
  const {
    overrides,
    showOverrides,
    setShowOverrides,
    newKey,
    setNewKey,
    newDelta,
    setNewDelta,
    addOverride,
    removeOverride,
  } = useScoreOverrides();
  const {
    teams,
    selectedDay,
    selectDay,
    effectiveTeams,
    getEffectiveHeadcount,
    updateHeadcount,
    saveHeadcounts,
    isDirtyHeadcount,
    applyScoreUpdates,
  } = useHeadcounts(initialTeams, setNotice);
  const { isSaving, saveResults } = useSeatPersistence(setNotice);
  const placement = usePlacement({ mode: savedMode });

  const [hoveredJinName, setHoveredJinName] = useState<string | null>(null);

  // Auto-initialize from saved assignment on mount so the previous layout is visible immediately.
  useEffect(() => {
    placement.actions.hydrate(initialTeams, savedAssignments, savedJinAssignments, savedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jinUnits = useMemo(() => buildJinUnits(effectiveTeams), [effectiveTeams]);

  const {
    teamMap,
    teamColorMap,
    seatCountMap,
    earnedScoreMap,
    jinEarnedScoreMap,
    totalSeats,
    sortedTeams,
    sortedJinUnits,
  } = useSeatDerivations({
    teams,
    mode: placement.mode,
    jinUnits,
    assignments: placement.assignments,
    algoResults: placement.algoResults,
    jinAlgoResults: placement.jinAlgoResults,
  });

  const assignedTotal = Object.keys(placement.assignments).length;
  const totalDemand =
    placement.mode === 'jin'
      ? jinUnits.reduce((s, u) => s + u.headcount, 0)
      : effectiveTeams.reduce((s, t) => s + t.headcount, 0);

  function handleRunAlgorithm() {
    if (placement.mode === 'jin') {
      const result = placement.actions.runJin(jinUnits, overrides);
      if (!result.ok) {
        setNotice({ type: "ok", msg: "배치할 진이 없습니다" });
        return;
      }
      setNotice({ type: "ok", msg: `${result.jinCount}진 · ${result.seatCount}석 배정 완료` });
      return;
    }
    const result = placement.actions.runTeam(effectiveTeams, overrides);
    setNotice({ type: "ok", msg: `${result.placedTeams}팀 · ${result.seatCount}석 배정 완료` });
  }

  function handleClearAssignments() {
    const result = placement.actions.clear(jinUnits);
    if (!result.hadSaved) {
      setNotice({ type: "err", msg: "저장된 배치 결과가 없습니다" });
    }
  }

  function handleSaveResults() {
    saveResults({
      mode: placement.mode,
      assignments: placement.assignments,
      algoResults: placement.algoResults,
      jinAlgoResults: placement.jinAlgoResults,
      jinUnits,
      jinStatuses: placement.jinStatuses,
      onScoreUpdate: applyScoreUpdates,
      onSaved: placement.actions.markSaved,
    });
  }

  // Wrapped in useCallback (stable identity) so FloorView/SectionView's React.memo is effective.
  const handleRowClick = useCallback(
    (sectionId: string, rowIdx: number) => {
      const result = placement.actions.placeJinAtRow(jinUnits, sectionId, rowIdx, overrides);
      if (!result.feasible) {
        setNotice({ type: "err", msg: "해당 행부터 배치 불가합니다" });
      }
    },
    [placement.actions, jinUnits, overrides, setNotice],
  );

  const handleRowHover = useCallback(
    (sectionId: string, rowIdx: number) => {
      placement.actions.previewRow(jinUnits, sectionId, rowIdx, overrides);
    },
    [placement.actions, jinUnits, overrides],
  );

  const handleRowLeave = useCallback(() => {
    placement.actions.clearPreview();
  }, [placement.actions]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toast notice={notice} onRetry={() => { setNotice(null); handleSaveResults(); }} />

      <AdminHeader
        isPreviousView={placement.isPreviousView}
        assignedTotal={assignedTotal}
        totalSeats={totalSeats}
        mode={placement.mode}
        teamsCount={teams.length}
        jinsCount={jinUnits.length}
        totalDemand={totalDemand}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-px bg-foreground">
        {/* Sidebar */}
        <aside className="bg-background p-6 space-y-6">
          <ModeToggle mode={placement.mode} onSwitch={placement.actions.switchMode} />
          <DaySelector selectedDay={selectedDay} onSelect={selectDay} />
          <ActionBar
            onRun={handleRunAlgorithm}
            onClear={handleClearAssignments}
            onSave={handleSaveResults}
            clearDisabled={assignedTotal === 0 || placement.isPreviousView}
            saveDisabled={isSaving || placement.isPreviousView}
            isSaving={isSaving}
          />

          {/* Teams / Jins list */}
          <div className="border-t border-foreground pt-5">
            {placement.mode === 'jin' ? (
              <JinList
                jinUnits={sortedJinUnits}
                jinStatuses={placement.jinStatuses}
                readyJin={placement.readyJin}
                seatCountMap={seatCountMap}
                jinEarnedScoreMap={jinEarnedScoreMap}
                onJinClick={placement.actions.toggleJin}
                onJinHover={setHoveredJinName}
              />
            ) : (
              <TeamList
                teams={sortedTeams}
                isDirtyHeadcount={isDirtyHeadcount}
                onSaveHeadcounts={saveHeadcounts}
                getEffectiveHeadcount={getEffectiveHeadcount}
                onUpdateHeadcount={updateHeadcount}
                teamColorMap={teamColorMap}
                seatCountMap={seatCountMap}
                earnedScoreMap={earnedScoreMap}
                highlightTeamId={placement.highlightTeamId}
                onHighlight={placement.actions.toggleHighlight}
              />
            )}
          </div>

          <OverridesPanel
            overrides={overrides}
            showOverrides={showOverrides}
            onToggleShow={() => setShowOverrides((p) => !p)}
            newKey={newKey}
            setNewKey={setNewKey}
            newDelta={newDelta}
            setNewDelta={setNewDelta}
            onAdd={addOverride}
            onRemove={removeOverride}
          />

          <Legend mode={placement.mode} />
        </aside>

        {/* Floor map */}
        <main
          className="bg-background p-4 md:p-8 space-y-12 overflow-x-auto"
          onMouseLeave={handleRowLeave}
        >
          {FLOORS.map((floor) => (
            <FloorView
              key={floor.id}
              floor={floor}
              assignments={placement.assignments}
              teamMap={teamMap}
              teamColorMap={teamColorMap}
              highlightTeamId={placement.mode === 'jin' ? null : placement.highlightTeamId}
              hoveredJinName={placement.mode === 'jin' ? hoveredJinName : null}
              hasReadyJin={!!placement.readyJin}
              hoverPreview={placement.hoverPreview}
              onRowClick={handleRowClick}
              onRowHover={handleRowHover}
              onRowLeave={handleRowLeave}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
