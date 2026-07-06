"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Eye, Play, RotateCcw, Save, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSeating } from "./utils/seatingAlgorithm";
import { buildJinUnits, jinUnitsToFakeTeams, algoResultsToJinResults } from "./utils/jinGrouping";
import { tryPlaceAtRow } from "./utils/manualPlacement";
import { FLOORS, type FloorDef, type SectionDef } from "./config/seatLayout";
import { getBaseScore, isSeatDisabled } from "./config/seatScores";
import { computeTeamColors } from "./config/teamColors";
import type { Team, AlgoResult, JinUnit, JinAlgoResult, DayKey, JinPlacementStatus } from "@/types/seating";

interface Props {
  initialTeams: Team[];
  savedAssignments: Record<string, number>;
  savedJinAssignments: Record<string, string>;
  savedMode: 'team' | 'jin';
}

type Notice = { type: "ok" | "err"; msg: string; retry?: boolean };

// Derive row keys (format: "1F_A_r2") from seat assignment keys for preOccupied set.
function getOccupiedRowKeys(assignments: Record<string, number>): Set<string> {
  const keys = new Set<string>();
  for (const seatKey of Object.keys(assignments)) {
    const parts = seatKey.split("_"); // ['1F','A','R3','C5']
    const rowIdx = parseInt(parts[2].slice(1)) - 1; // 'R3' → 2
    keys.add(`${parts[0]}_${parts[1]}_r${rowIdx}`);
  }
  return keys;
}

const DAY_LABELS: Record<'base' | DayKey, string> = {
  base: '기준', thu: '목', fri: '금', sat: '토', sun: '일',
};

export default function AdminClient({ initialTeams, savedAssignments, savedJinAssignments, savedMode }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [mode, setMode] = useState<'team' | 'jin'>(savedMode);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [algoResults, setAlgoResults] = useState<AlgoResult[]>([]);
  const [jinAlgoResults, setJinAlgoResults] = useState<JinAlgoResult[]>([]);
  const [isDirtyHeadcount, setIsDirtyHeadcount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [highlightTeamId, setHighlightTeamId] = useState<number | null>(null);
  const [isPreviousView, setIsPreviousView] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [showOverrides, setShowOverrides] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDelta, setNewDelta] = useState("");

  // Day-specific headcount
  const [selectedDay, setSelectedDay] = useState<'base' | DayKey>('base');

  // Jin placement state
  const [jinStatuses, setJinStatuses] = useState<Map<string, JinPlacementStatus>>(new Map());
  const [readyJin, setReadyJin] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ seatKeys: Set<string>; feasible: boolean } | null>(null);
  const [hoveredJinName, setHoveredJinName] = useState<string | null>(null);

  // Tracks the most recently saved assignment so clearAssignments always restores
  // the latest saved state, even if a new save happened during this session.
  const lastSaved = useRef<{ mode: 'team' | 'jin'; assignments: Record<string, number> }>({
    mode: savedMode,
    assignments: {},
  });

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Auto-initialize from saved assignment on mount so the previous layout is visible immediately.
  useEffect(() => {
    if (savedMode === 'jin') {
      if (!Object.keys(savedJinAssignments).length) return;
      const units = buildJinUnits(initialTeams);
      const idMap = new Map(units.map((u) => [u.jinName, u.syntheticId]));
      const next: Record<string, number> = {};
      const placedJinNames = new Set<string>();
      const jinSeatKeysMap = new Map<string, string[]>();

      for (const [key, jinName] of Object.entries(savedJinAssignments)) {
        next[key] = idMap.get(jinName) ?? -1;
        if (idMap.has(jinName)) placedJinNames.add(jinName);
        if (!jinSeatKeysMap.has(jinName)) jinSeatKeysMap.set(jinName, []);
        jinSeatKeysMap.get(jinName)!.push(key);
      }

      // Rebuild jinAlgoResults so handleJinClick can remove seats when a placed jin is clicked.
      const unitMap = new Map(units.map((u) => [u.jinName, u]));
      const reconstructedJinResults: JinAlgoResult[] = [];
      const reconstructedAlgoResults: AlgoResult[] = [];
      for (const [jinName, seatKeys] of jinSeatKeysMap.entries()) {
        const unit = unitMap.get(jinName);
        const synId = idMap.get(jinName);
        if (!unit || synId === undefined) continue;
        const parts = seatKeys[0].split('_');
        const block = parts[1];
        const floor = parts[0] === '1F' ? 1 : 2;
        reconstructedJinResults.push({ syntheticId: synId, jinName, memberTeamIds: unit.memberTeamIds, seatKeys, block, floor, earnedScore: 0 });
        reconstructedAlgoResults.push({ teamId: synId, seatKeys, block, floor, earnedScore: 0 });
      }

      lastSaved.current = { mode: 'jin', assignments: next };
      setAssignments(next);
      setJinAlgoResults(reconstructedJinResults);
      setAlgoResults(reconstructedAlgoResults);

      const statuses = new Map<string, JinPlacementStatus>();
      for (const u of units) {
        statuses.set(u.jinName, placedJinNames.has(u.jinName) ? 'placed' : 'unplaced');
      }
      setJinStatuses(statuses);
      setIsPreviousView(true);
    } else {
      if (!Object.keys(savedAssignments).length) return;
      lastSaved.current = { mode: 'team', assignments: savedAssignments };
      setAssignments(savedAssignments);
      setIsPreviousView(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const stored = localStorage.getItem("seat_score_overrides");
      if (stored) setOverrides(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("seat_score_overrides", JSON.stringify(overrides));
  }, [overrides]);

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

  function addOverride() {
    const key = newKey.trim();
    const delta = parseFloat(newDelta);
    if (!key || isNaN(delta)) return;
    setOverrides((prev) => ({ ...prev, [key]: delta }));
    setNewKey("");
    setNewDelta("");
  }

  function removeOverride(key: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const jinUnits = useMemo(() => buildJinUnits(effectiveTeams), [effectiveTeams]);

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

  const assignedTotal = Object.keys(assignments).length;
  const totalDemand =
    mode === 'jin'
      ? jinUnits.reduce((s, u) => s + u.headcount, 0)
      : effectiveTeams.reduce((s, t) => s + t.headcount, 0);

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
      setNotice({ type: "ok", msg: "인원 저장 완료" });
    } else {
      setNotice({ type: "err", msg: "인원 저장 실패" });
    }
  }

  function switchMode(next: 'team' | 'jin') {
    if (next === mode) return;
    setMode(next);
    setAlgoResults([]);
    setJinAlgoResults([]);
    setAssignments({});
    setHighlightTeamId(null);
    setIsPreviousView(false);
    setJinStatuses(new Map());
    setReadyJin(null);
    setHoverPreview(null);
  }

  function runAlgorithm() {
    if (mode === 'jin') {
      // Only place unplaced jins — skip placed/ready ones.
      const toPlace =
        jinStatuses.size === 0
          ? jinUnits
          : jinUnits.filter((u) => (jinStatuses.get(u.jinName) ?? 'unplaced') === 'unplaced');

      if (toPlace.length === 0) {
        setNotice({ type: "ok", msg: "배치할 진이 없습니다" });
        return;
      }

      const occupiedRowKeys = getOccupiedRowKeys(assignments);
      const fakeTeams = jinUnitsToFakeTeams(toPlace);
      const results = generateSeating(fakeTeams, overrides, {
        jinMode: true,
        preOccupiedRowKeys: occupiedRowKeys,
      });
      const newJinResults = algoResultsToJinResults(results, toPlace);

      const newSeatAssignments: Record<string, number> = {};
      for (const r of results) for (const key of r.seatKeys) newSeatAssignments[key] = r.teamId;

      setAlgoResults((prev) => [...prev, ...results]);
      setJinAlgoResults((prev) => [...prev, ...newJinResults]);
      setAssignments((prev) => ({ ...prev, ...newSeatAssignments }));
      setIsPreviousView(false);

      const placedNames = new Set(newJinResults.map((r) => r.jinName));
      setJinStatuses((prev) => {
        const next = new Map(prev);
        for (const u of toPlace) {
          next.set(u.jinName, placedNames.has(u.jinName) ? 'placed' : 'unplaced');
        }
        return next;
      });

      setNotice({
        type: "ok",
        msg: `${newJinResults.length}진 · ${Object.keys(newSeatAssignments).length}석 배정 완료`,
      });
      return;
    }

    const results = generateSeating(effectiveTeams, overrides);
    setAlgoResults(results);
    const next: Record<string, number> = {};
    for (const r of results) for (const key of r.seatKeys) next[key] = r.teamId;
    setAssignments(next);
    setIsPreviousView(false);
    const placed = results.filter((r) => r.seatKeys.length > 0).length;
    setNotice({ type: "ok", msg: `${placed}팀 · ${Object.keys(next).length}석 배정 완료` });
  }

  function clearAssignments() {
    setHighlightTeamId(null);
    setReadyJin(null);
    setHoverPreview(null);

    const { mode: m, assignments: a } = lastSaved.current;
    setMode(m);
    setAssignments({ ...a });
    setIsPreviousView(Object.keys(a).length > 0);

    if (m === 'jin') {
      // Rebuild jinAlgoResults/algoResults from the restored assignments so a subsequent
      // manual placement can find each jin's full seat set when resolving overlaps
      // (see handleRowClick — it looks up conflicting jins via jinAlgoResults).
      const seatsByJinId = new Map<number, string[]>();
      for (const [key, synId] of Object.entries(a)) {
        if (!seatsByJinId.has(synId)) seatsByJinId.set(synId, []);
        seatsByJinId.get(synId)!.push(key);
      }

      const reconstructedJinResults: JinAlgoResult[] = [];
      const reconstructedAlgoResults: AlgoResult[] = [];
      for (const [synId, seatKeys] of seatsByJinId.entries()) {
        const unit = jinUnits.find((u) => u.syntheticId === synId);
        if (!unit) continue;
        const parts = seatKeys[0].split('_');
        const block = parts[1];
        const floor = parts[0] === '1F' ? 1 : 2;
        reconstructedJinResults.push({
          syntheticId: synId,
          jinName: unit.jinName,
          memberTeamIds: unit.memberTeamIds,
          seatKeys,
          block,
          floor,
          earnedScore: 0,
        });
        reconstructedAlgoResults.push({ teamId: synId, seatKeys, block, floor, earnedScore: 0 });
      }
      setJinAlgoResults(reconstructedJinResults);
      setAlgoResults(reconstructedAlgoResults);

      const statuses = new Map<string, JinPlacementStatus>();
      for (const u of jinUnits) {
        statuses.set(u.jinName, seatsByJinId.has(u.syntheticId) ? 'placed' : 'unplaced');
      }
      setJinStatuses(statuses);
    } else {
      setAlgoResults([]);
      setJinAlgoResults([]);
      setJinStatuses(new Map());
    }

    if (!Object.keys(a).length) {
      setNotice({ type: "err", msg: "저장된 배치 결과가 없습니다" });
    }
  }

  async function saveResults() {
    if (mode === 'jin') {
      // All jins must be placed before saving.
      const unplaced = jinUnits.filter(
        (u) => (jinStatuses.get(u.jinName) ?? 'unplaced') !== 'placed',
      );
      if (unplaced.length > 0) {
        setNotice({
          type: "err",
          msg: `배치 미완료 진: ${unplaced.map((u) => u.jinName).join(', ')}`,
        });
        return;
      }
      if (!jinAlgoResults.length) {
        setNotice({ type: "err", msg: "배치를 먼저 실행해주세요" });
        return;
      }
      setIsSaving(true);
      try {
        const res = await fetch("/api/seat-assignments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: 'jin', jinResults: jinAlgoResults }),
        });
        if (res.ok) {
          const data = await res.json();
          lastSaved.current = { mode: 'jin', assignments: { ...assignments } };
          setTeams((prev) =>
            prev.map((t) => {
              const updated = data.teams?.find(
                (u: { id: number; accumulated_score: number }) => u.id === t.id,
              );
              return updated ? { ...t, accumulated_score: updated.accumulated_score } : t;
            }),
          );
          setNotice({ type: "ok", msg: "배치 결과 저장 완료" });
        } else {
          setNotice({ type: "err", msg: "저장 실패" });
        }
      } catch {
        setNotice({ type: "err", msg: "네트워크 오류 — 저장되지 않았습니다", retry: true });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!algoResults.length) {
      setNotice({ type: "err", msg: "먼저 자동 배치를 실행해주세요" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/seat-assignments/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: algoResults }),
      });
      if (res.ok) {
        const data = await res.json();
        lastSaved.current = { mode: 'team', assignments: { ...assignments } };
        setTeams((prev) =>
          prev.map((t) => {
            const updated = data.teams?.find(
              (u: { id: number; accumulated_score: number }) => u.id === t.id,
            );
            return updated ? { ...t, accumulated_score: updated.accumulated_score } : t;
          }),
        );
        setNotice({ type: "ok", msg: "배치 결과 저장 완료" });
      } else {
        setNotice({ type: "err", msg: "저장 실패" });
      }
    } catch {
      setNotice({ type: "err", msg: "네트워크 오류 — 저장되지 않았습니다", retry: true });
    } finally {
      setIsSaving(false);
    }
  }

  // --- Jin placement handlers ---

  function handleJinClick(u: JinUnit) {
    const currentStatus = jinStatuses.get(u.jinName) ?? 'unplaced';

    if (currentStatus === 'ready') {
      setReadyJin(null);
      setHoverPreview(null);
      setJinStatuses((prev) => {
        const next = new Map(prev);
        next.set(u.jinName, 'unplaced');
        return next;
      });
      return;
    }

    if (currentStatus === 'placed') {
      const jinResult = jinAlgoResults.find((r) => r.jinName === u.jinName);
      if (jinResult) {
        setJinAlgoResults((prev) => prev.filter((r) => r.jinName !== u.jinName));
        setAlgoResults((prev) => prev.filter((r) => r.teamId !== jinResult.syntheticId));
        setAssignments((prev) => {
          const next = { ...prev };
          for (const key of jinResult.seatKeys) delete next[key];
          return next;
        });
      }
    }

    // Deactivate any other ready jin.
    if (readyJin !== null && readyJin !== u.jinName) {
      setJinStatuses((prev) => {
        const next = new Map(prev);
        next.set(readyJin, 'unplaced');
        return next;
      });
    }

    setReadyJin(u.jinName);
    setHoverPreview(null);
    setJinStatuses((prev) => {
      const next = new Map(prev);
      next.set(u.jinName, 'ready');
      return next;
    });
  }

  function handleRowClick(sectionId: string, rowIdx: number) {
    if (!readyJin) return;
    const jin = jinUnits.find((u) => u.jinName === readyJin);
    if (!jin) return;

    const [floorId, blockLabel] = sectionId.split('-');
    const result = tryPlaceAtRow(
      sectionId,
      floorId as '1F' | '2F',
      rowIdx,
      jin.headcount,
      overrides,
    );

    if (!result.feasible) {
      setNotice({ type: "err", msg: "해당 행부터 배치 불가합니다" });
      return;
    }

    // Find conflicting placed jins whose seats overlap with the new placement.
    const conflictingJinNames = new Set<string>();
    for (const key of result.seatKeys) {
      const existingId = assignments[key];
      if (existingId !== undefined) {
        const existingUnit = jinUnits.find((u) => u.syntheticId === existingId);
        if (existingUnit && existingUnit.jinName !== readyJin) {
          conflictingJinNames.add(existingUnit.jinName);
        }
      }
    }

    const keysToRemove = new Set<string>();
    for (const conflictName of conflictingJinNames) {
      const cr = jinAlgoResults.find((r) => r.jinName === conflictName);
      if (cr) for (const k of cr.seatKeys) keysToRemove.add(k);
    }

    const newJinResult: JinAlgoResult = {
      syntheticId: jin.syntheticId,
      jinName: jin.jinName,
      memberTeamIds: jin.memberTeamIds,
      seatKeys: result.seatKeys,
      block: blockLabel,
      floor: floorId === '1F' ? 1 : 2,
      earnedScore: result.earnedScore,
    };
    const newAlgoResult: AlgoResult = {
      teamId: jin.syntheticId,
      seatKeys: result.seatKeys,
      block: blockLabel,
      floor: floorId === '1F' ? 1 : 2,
      earnedScore: result.earnedScore,
    };

    setAssignments((prev) => {
      const next = { ...prev };
      for (const k of keysToRemove) delete next[k];
      for (const k of result.seatKeys) next[k] = jin.syntheticId;
      return next;
    });
    setJinAlgoResults((prev) => [
      ...prev.filter(
        (r) => !conflictingJinNames.has(r.jinName) && r.jinName !== readyJin,
      ),
      newJinResult,
    ]);
    setAlgoResults((prev) => [
      ...prev.filter((r) => {
        const unit = jinUnits.find((u) => u.syntheticId === r.teamId);
        return !unit || (!conflictingJinNames.has(unit.jinName) && unit.jinName !== readyJin);
      }),
      newAlgoResult,
    ]);
    setJinStatuses((prev) => {
      const next = new Map(prev);
      next.set(readyJin, 'placed');
      for (const name of conflictingJinNames) next.set(name, 'unplaced');
      return next;
    });
    setReadyJin(null);
    setHoverPreview(null);
  }

  function handleRowHover(sectionId: string, rowIdx: number) {
    if (!readyJin) return;
    const jin = jinUnits.find((u) => u.jinName === readyJin);
    if (!jin) return;
    const [floorId] = sectionId.split('-');
    const result = tryPlaceAtRow(
      sectionId,
      floorId as '1F' | '2F',
      rowIdx,
      jin.headcount,
      overrides,
    );
    setHoverPreview({ seatKeys: new Set(result.seatKeys), feasible: result.feasible });
  }

  function handleRowLeave() {
    if (readyJin) setHoverPreview(null);
  }

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.accumulated_score - b.accumulated_score),
    [teams],
  );
  const sortedJinUnits = useMemo(
    () => [...jinUnits].sort((a, b) => a.accumulated_score - b.accumulated_score),
    [jinUnits],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Toast notification */}
      {notice && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 font-display text-sm font-bold tracking-wide border flex items-center gap-3",
            notice.type === "ok"
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-foreground border-foreground",
          )}
        >
          <span>{notice.msg}</span>
          {notice.retry && (
            <button
              onClick={() => { setNotice(null); saveResults(); }}
              className="underline underline-offset-2 shrink-0 hover:no-underline"
            >
              재시도
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-foreground px-6 py-5 md:px-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50">
              Sanctuary Seating · Auto Allocation
            </span>
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight mt-1">
              좌석 자동 배치 · 관리자
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0 text-sm font-display">
            {isPreviousView && (
              <span className="border border-red-500 text-red-500 px-3 py-1 tracking-widest">
                현재 이전 배치
              </span>
            )}
            <span className="border border-foreground px-3 py-1 tracking-widest">
              {assignedTotal} / {totalSeats}석
            </span>
            <span className="border border-foreground px-3 py-1 tracking-widest">
              {mode === 'jin' ? `${jinUnits.length}진` : `${teams.length}팀`} · {totalDemand}명
            </span>
            <Link
              href="/seat"
              className="flex items-center gap-1.5 border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              사용자 화면
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-px bg-foreground">
        {/* Sidebar */}
        <aside className="bg-background p-6 space-y-6">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 border border-foreground">
            <button
              onClick={() => switchMode('team')}
              className={cn(
                "font-display font-bold text-xs py-2 tracking-wider transition-colors",
                mode === 'team' ? "bg-foreground text-background" : "hover:bg-foreground/10",
              )}
            >
              팀별
            </button>
            <button
              onClick={() => switchMode('jin')}
              className={cn(
                "font-display font-bold text-xs py-2 tracking-wider transition-colors border-l border-foreground",
                mode === 'jin' ? "bg-foreground text-background" : "hover:bg-foreground/10",
              )}
            >
              진별
            </button>
          </div>

          {/* Day selector */}
          <div>
            <span className="font-display text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/40 block mb-1.5">
              배치 회차
            </span>
            <div className="flex border border-foreground">
              {((['base', 'thu', 'fri', 'sat', 'sun'] as const)).map((d, i) => (
                <button
                  key={d}
                  onClick={() => { setSelectedDay(d); setIsDirtyHeadcount(false); }}
                  className={cn(
                    "flex-1 font-display font-bold text-[10px] py-1.5 tracking-wider transition-colors",
                    i > 0 && "border-l border-foreground",
                    selectedDay === d
                      ? "bg-foreground text-background"
                      : "hover:bg-foreground/10",
                  )}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={runAlgorithm}
              className="w-full flex items-center gap-2 justify-center bg-foreground text-background font-display font-bold text-sm px-4 py-2.5 hover:opacity-80 transition-opacity"
            >
              <Play className="h-4 w-4" />
              자동 배치 실행
            </button>
            <button
              onClick={clearAssignments}
              disabled={assignedTotal === 0 || isPreviousView}
              className="w-full flex items-center gap-2 justify-center border border-foreground font-display font-bold text-sm px-4 py-2.5 hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              배치 초기화
            </button>
            <button
              onClick={saveResults}
              disabled={isSaving || isPreviousView}
              className="w-full flex items-center gap-2 justify-center border border-foreground font-display font-bold text-sm px-4 py-2.5 hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "저장 중..." : "배치 결과 저장"}
            </button>
          </div>

          {/* Teams / Jins list */}
          <div className="border-t border-foreground pt-5">
            {mode === 'jin' ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50">
                    Jins · 누적점수순
                  </span>
                  {readyJin && (
                    <span className="text-[9px] font-display text-amber-600 font-bold animate-pulse">
                      행 클릭하여 배치
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[16px_1fr_40px_28px_34px_34px] gap-2 px-1 mb-1 text-[9px] font-display tracking-wider uppercase text-foreground/50">
                  <span />
                  <span>진</span>
                  <span>인원</span>
                  <span>배치</span>
                  <span>획득</span>
                  <span>누적</span>
                </div>
                <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
                  {sortedJinUnits.map((u) => {
                    const earned = jinEarnedScoreMap.get(u.syntheticId);
                    const status = jinStatuses.get(u.jinName) ?? 'unplaced';
                    return (
                      <div
                        key={u.jinName}
                        onClick={() => handleJinClick(u)}
                        onMouseEnter={() => setHoveredJinName(u.jinName)}
                        onMouseLeave={() => setHoveredJinName(null)}
                        className={cn(
                          "grid grid-cols-[16px_1fr_40px_28px_34px_34px] gap-2 items-center cursor-pointer -mx-1 px-1 py-0.5 transition-colors",
                          status === 'ready'
                            ? "bg-amber-50 ring-1 ring-inset ring-amber-400"
                            : "hover:bg-foreground/8",
                        )}
                      >
                        {/* Status icon */}
                        {status === 'placed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : status === 'ready' ? (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-amber-500 animate-pulse" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-foreground/20" />
                        )}
                        <div className="min-w-0">
                          <div className="font-display text-xs font-bold truncate">
                            {u.jinName}
                          </div>
                          <div className="text-[10px] text-foreground/50 truncate">
                            {u.memberTeamIds.length}교회
                            {status === 'ready' && (
                              <span className="ml-1 text-amber-600">배치 준비</span>
                            )}
                            {status === 'placed' && (
                              <span className="ml-1 text-green-600">배치완료</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-display tabular-nums text-right text-foreground/60">
                          {u.headcount}
                        </span>
                        <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                          {seatCountMap.get(u.syntheticId) ?? 0}
                        </span>
                        <span className="text-[10px] font-display tabular-nums text-right">
                          {earned !== undefined ? earned.toFixed(1) : "–"}
                        </span>
                        <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                          {Math.round(u.accumulated_score)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50">
                    Teams · 누적점수순
                  </span>
                  {isDirtyHeadcount && (
                    <button
                      onClick={saveHeadcounts}
                      className="text-[10px] font-display font-bold tracking-wider border border-foreground px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
                    >
                      인원 저장
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[12px_1fr_48px_28px_34px_34px] gap-2 px-1 mb-1 text-[9px] font-display tracking-wider uppercase text-foreground/50">
                  <span />
                  <span>교회</span>
                  <span>인원</span>
                  <span>배치</span>
                  <span>획득</span>
                  <span>누적</span>
                </div>
                <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
                  {sortedTeams.map((t) => {
                    const earned = earnedScoreMap.get(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() =>
                          setHighlightTeamId((prev) => (prev === t.id ? null : t.id))
                        }
                        className={cn(
                          "grid grid-cols-[12px_1fr_48px_28px_34px_34px] gap-2 items-center cursor-pointer -mx-1 px-1 py-0.5 transition-colors",
                          highlightTeamId === t.id
                            ? "bg-foreground/15 ring-1 ring-inset ring-foreground"
                            : "hover:bg-foreground/8",
                        )}
                      >
                        <span
                          className="h-3 w-3 shrink-0 border border-foreground/50"
                          style={{ background: teamColorMap.get(t.id) ?? "oklch(0.88 0 0)" }}
                        />
                        <div className="min-w-0">
                          <div className="font-display text-xs font-bold truncate">
                            {t.church_name}
                          </div>
                          {t.team_name && (
                            <div className="text-[10px] text-foreground/50 truncate">
                              {t.team_name}
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={getEffectiveHeadcount(t)}
                          onChange={(e) =>
                            updateHeadcount(t.id, parseInt(e.target.value) || 1)
                          }
                          className="w-full h-7 px-2 text-xs font-display border border-foreground/30 bg-background focus:border-foreground focus:outline-none text-right"
                        />
                        <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                          {seatCountMap.get(t.id) ?? 0}
                        </span>
                        <span className="text-[10px] font-display tabular-nums text-right">
                          {earned !== undefined ? earned.toFixed(1) : "–"}
                        </span>
                        <span className="text-[10px] font-display tabular-nums text-foreground/60 text-right">
                          {Math.round(t.accumulated_score)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Score Overrides */}
          <div className="border-t border-foreground pt-5">
            <button
              onClick={() => setShowOverrides((p) => !p)}
              className="w-full flex items-center justify-between mb-3"
            >
              <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50 flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                점수 보정 설정
                {Object.keys(overrides).length > 0 && (
                  <span className="bg-foreground text-background px-1 font-mono">
                    {Object.keys(overrides).length}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-display text-foreground/40">
                {showOverrides ? "▲" : "▼"}
              </span>
            </button>

            {showOverrides && (
              <div className="space-y-2">
                <p className="text-[10px] text-foreground/50 leading-relaxed border border-foreground/20 p-2 font-mono">
                  키 형식: <strong>1F_C_R3_C6</strong>
                  <br />
                  보정값: 양수(+점수) / 음수(−점수)
                  <br />
                  배치 실행 시 earnedScore에 반영됨
                </p>

                {Object.entries(overrides).length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(overrides).map(([key, delta]) => (
                      <div key={key} className="flex items-center gap-1 text-[10px] font-mono">
                        <span className="flex-1 truncate text-foreground/70">{key}</span>
                        <span
                          className={cn(
                            "w-10 text-right tabular-nums font-bold shrink-0",
                            delta > 0 ? "text-foreground" : "text-foreground/50",
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                        <button
                          onClick={() => removeOverride(key)}
                          className="shrink-0 text-foreground/30 hover:text-foreground ml-1"
                          aria-label="삭제"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1 pt-0.5">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOverride()}
                    placeholder="1F_C_R3_C6"
                    className="flex-1 h-6 px-1.5 text-[10px] font-mono border border-foreground/40 bg-background focus:outline-none focus:border-foreground min-w-0"
                  />
                  <input
                    type="number"
                    value={newDelta}
                    onChange={(e) => setNewDelta(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOverride()}
                    placeholder="±"
                    className="w-10 h-6 px-1 text-[10px] font-mono border border-foreground/40 bg-background focus:outline-none focus:border-foreground text-right shrink-0"
                  />
                  <button
                    onClick={addOverride}
                    className="h-6 px-2 text-[10px] font-display font-bold border border-foreground hover:bg-foreground hover:text-background transition-colors shrink-0"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="border-t border-foreground pt-4 space-y-2 text-xs text-foreground/50">
            {mode === 'jin' && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  <span>배치완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>배치 준비 (클릭 후 행 선택)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-foreground/20 shrink-0" />
                  <span>배치 미완료</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 border border-foreground/30 bg-foreground/10 shrink-0" />
              <span>비활성 좌석 (POP 구역)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 border border-foreground/30 shrink-0" />
              <span>빈 좌석</span>
            </div>
          </div>
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
              assignments={assignments}
              teamMap={teamMap}
              teamColorMap={teamColorMap}
              highlightTeamId={mode === 'jin' ? null : highlightTeamId}
              hoveredJinName={mode === 'jin' ? hoveredJinName : null}
              hasReadyJin={!!readyJin}
              hoverPreview={hoverPreview}
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
}: {
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
}) {
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

function SectionView({
  section,
  floorId,
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
}: {
  section: SectionDef;
  floorId: "1F" | "2F";
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
}) {
  const block = section.id.split("-")[1];
  const maxCols = Math.max(...section.rows.map((r) => r.count));

  const activeRowNums = section.rows
    .map((_, r) => r)
    .filter((r) => !isSeatDisabled(`${floorId}_${block}_R${r + 1}_C1`));
  const activeCount = activeRowNums.length;

  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50 mb-2">
        {section.label}
      </span>
      <div className="flex flex-col gap-[3px]">
        {section.rows.map((row, rIdx) => {
          const leftPad = Math.floor((maxCols - row.count) / 2);
          const isActive = activeRowNums.includes(rIdx);
          const rowScore = isActive ? getBaseScore(floorId, rIdx, activeCount) : null;

          const rowTeamId = assignments[`${floorId}_${block}_R${rIdx + 1}_C1`];
          const prevRowTeamId =
            rIdx > 0 ? assignments[`${floorId}_${block}_R${rIdx}_C1`] : undefined;
          const isTeamStart = !!rowTeamId && rowTeamId !== prevRowTeamId;
          const rowTeam = isTeamStart ? teamMap.get(rowTeamId) : undefined;

          const isRowClickable = hasReadyJin && isActive;

          return (
            <div
              key={rIdx}
              className={cn("flex gap-[3px] items-center", isRowClickable && "cursor-pointer")}
              onClick={isRowClickable ? () => onRowClick(section.id, rIdx) : undefined}
              onMouseEnter={isRowClickable ? () => onRowHover(section.id, rIdx) : undefined}
              onMouseLeave={isRowClickable ? () => onRowLeave() : undefined}
            >
              <span className="font-display text-[9px] text-foreground/40 w-4 text-right tabular-nums shrink-0">
                {rIdx + 1}
              </span>
              <div
                className="grid gap-[3px] relative"
                style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
              >
                {isTeamStart && rowTeam && (
                  <div
                    className="absolute inset-0 z-10 flex items-center px-1 pointer-events-none font-display text-[9px] font-bold truncate text-foreground"
                    style={{ textShadow: "0 0 3px #fff, 0 0 3px #fff" }}
                  >
                    {rowTeam.church_name}
                  </div>
                )}
                {Array.from({ length: maxCols }).map((_, cIdx) => {
                  const inRow = cIdx >= leftPad && cIdx < leftPad + row.count;
                  if (!inRow) return <span key={cIdx} className="w-4 h-4 md:w-5 md:h-5" />;

                  const key = `${floorId}_${block}_R${rIdx + 1}_C${cIdx - leftPad + 1}`;
                  const disabled = isSeatDisabled(key);
                  const teamId = assignments[key];
                  const team = teamId ? teamMap.get(teamId) : undefined;
                  const isHighlight = highlightTeamId !== null && teamId === highlightTeamId;
                  const isDimmed = highlightTeamId !== null && !!teamId && !isHighlight;
                  const isJinHover = hoveredJinName !== null && !!team && team.jin_name === hoveredJinName;

                  const isInPreview = !disabled && (hoverPreview?.seatKeys.has(key) ?? false);
                  let bg: string | undefined;
                  if (disabled) {
                    bg = "oklch(0.85 0 0)";
                  } else if (isInPreview) {
                    bg = hoverPreview!.feasible
                      ? "oklch(0.7 0.18 60 / 85%)"   // orange preview
                      : "oklch(0.5 0.22 20 / 85%)";  // red preview (infeasible)
                  } else {
                    bg = teamColorMap.get(teamId);
                  }

                  return (
                    <div
                      key={cIdx}
                      title={
                        disabled
                          ? "POP 고정석"
                          : team
                            ? `${section.label}구역 ${rIdx + 1}열 · ${team.church_name}`
                            : `${section.label}구역 ${rIdx + 1}열`
                      }
                      className={cn(
                        "w-4 h-4 md:w-5 md:h-5 flex items-center justify-center transition-opacity",
                        isJinHover ? "border-2 border-foreground" : "border border-foreground/40",
                        isDimmed && "opacity-15",
                        isHighlight && "ring-2 ring-foreground ring-offset-0",
                      )}
                      style={{ background: bg }}
                    >
                      {!disabled && !isInPreview && rowScore !== null && (
                        <span className="text-[6px] md:text-[7px] font-display tabular-nums leading-none select-none pointer-events-none text-black/50">
                          {rowScore}
                        </span>
                      )}
                    </div>
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
