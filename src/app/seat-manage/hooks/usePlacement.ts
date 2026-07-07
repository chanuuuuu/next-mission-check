import { useEffect, useMemo, useReducer, useRef } from "react";
import { generateSeating } from "../utils/seatingAlgorithm";
import { buildJinUnits, jinUnitsToFakeTeams, algoResultsToJinResults } from "../utils/jinGrouping";
import { tryPlaceAtRow } from "../utils/manualPlacement";
import { getOccupiedRowKeys } from "../utils/seatKeys";
import type { Team, AlgoResult, JinUnit, JinAlgoResult, JinPlacementStatus } from "@/types/seating";

export interface HoverPreview {
  seatKeys: Set<string>;
  feasible: boolean;
}

export interface PlacementState {
  mode: 'team' | 'jin';
  assignments: Record<string, number>;
  algoResults: AlgoResult[];
  jinAlgoResults: JinAlgoResult[];
  highlightTeamId: number | null;
  isPreviousView: boolean;
  readyJin: string | null;
  hoverPreview: HoverPreview | null;
}

interface PlacementAction {
  type: string;
  payload: Partial<PlacementState>;
}

function placementReducer(state: PlacementState, action: PlacementAction): PlacementState {
  return { ...state, ...action.payload };
}

// jinStatuses is fully derivable from jinAlgoResults (placed) + readyJin (ready) — see refactor plan
// rationale: keeping it as separately-synced state was the root cause of a placement desync bug class.
function deriveJinStatuses(
  jinAlgoResults: JinAlgoResult[],
  readyJin: string | null,
): Map<string, JinPlacementStatus> {
  const map = new Map<string, JinPlacementStatus>();
  for (const r of jinAlgoResults) {
    if (r.seatKeys.length > 0) map.set(r.jinName, 'placed');
  }
  if (readyJin !== null) map.set(readyJin, 'ready');
  return map;
}

export function usePlacement(init: { mode: 'team' | 'jin' }) {
  const [state, dispatch] = useReducer(placementReducer, {
    mode: init.mode,
    assignments: {},
    algoResults: [],
    jinAlgoResults: [],
    highlightTeamId: null,
    isPreviousView: false,
    readyJin: null,
    hoverPreview: null,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Tracks the most recently saved assignment so `clear` always restores the latest
  // saved state, even if a new save happened during this session.
  const lastSaved = useRef<{ mode: 'team' | 'jin'; assignments: Record<string, number> }>({
    mode: init.mode,
    assignments: {},
  });

  const jinStatuses = useMemo(
    () => deriveJinStatuses(state.jinAlgoResults, state.readyJin),
    [state.jinAlgoResults, state.readyJin],
  );

  const actions = useMemo(
    () => ({
      // Auto-initialize from saved assignment on mount so the previous layout is visible immediately.
      hydrate(
        initialTeams: Team[],
        savedAssignments: Record<string, number>,
        savedJinAssignments: Record<string, string>,
        savedMode: 'team' | 'jin',
      ) {
        if (savedMode === 'jin') {
          if (!Object.keys(savedJinAssignments).length) return;
          const units = buildJinUnits(initialTeams);
          const idMap = new Map(units.map((u) => [u.jinName, u.syntheticId]));
          const next: Record<string, number> = {};
          const jinSeatKeysMap = new Map<string, string[]>();

          for (const [key, jinName] of Object.entries(savedJinAssignments)) {
            next[key] = idMap.get(jinName) ?? -1;
            if (!jinSeatKeysMap.has(jinName)) jinSeatKeysMap.set(jinName, []);
            jinSeatKeysMap.get(jinName)!.push(key);
          }

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
          dispatch({
            type: 'HYDRATE',
            payload: {
              assignments: next,
              jinAlgoResults: reconstructedJinResults,
              algoResults: reconstructedAlgoResults,
              isPreviousView: true,
            },
          });
        } else {
          if (!Object.keys(savedAssignments).length) return;
          lastSaved.current = { mode: 'team', assignments: savedAssignments };
          dispatch({ type: 'HYDRATE', payload: { assignments: savedAssignments, isPreviousView: true } });
        }
      },

      switchMode(nextMode: 'team' | 'jin') {
        if (nextMode === stateRef.current.mode) return;
        dispatch({
          type: 'SWITCH_MODE',
          payload: {
            mode: nextMode,
            algoResults: [],
            jinAlgoResults: [],
            assignments: {},
            highlightTeamId: null,
            isPreviousView: false,
            readyJin: null,
            hoverPreview: null,
          },
        });
      },

      runTeam(effectiveTeams: Team[], overrides: Record<string, number>) {
        const results = generateSeating(effectiveTeams, overrides);
        const assignments: Record<string, number> = {};
        for (const r of results) for (const k of r.seatKeys) assignments[k] = r.teamId;
        dispatch({ type: 'RUN_TEAM', payload: { algoResults: results, assignments, isPreviousView: false } });
        const placedTeams = results.filter((r) => r.seatKeys.length > 0).length;
        return { placedTeams, seatCount: Object.keys(assignments).length };
      },

      runJin(jinUnits: JinUnit[], overrides: Record<string, number>): { ok: false } | { ok: true; jinCount: number; seatCount: number } {
        const current = stateRef.current;
        const statuses = deriveJinStatuses(current.jinAlgoResults, current.readyJin);
        const toPlace =
          statuses.size === 0
            ? jinUnits
            : jinUnits.filter((u) => (statuses.get(u.jinName) ?? 'unplaced') === 'unplaced');

        if (toPlace.length === 0) return { ok: false };

        const occupiedRowKeys = getOccupiedRowKeys(current.assignments);
        const fakeTeams = jinUnitsToFakeTeams(toPlace);
        const results = generateSeating(fakeTeams, overrides, {
          jinMode: true,
          preOccupiedRowKeys: occupiedRowKeys,
        });
        const newJinResults = algoResultsToJinResults(results, toPlace);

        const newSeatAssignments: Record<string, number> = {};
        for (const r of results) for (const key of r.seatKeys) newSeatAssignments[key] = r.teamId;

        dispatch({
          type: 'RUN_JIN',
          payload: {
            algoResults: [...current.algoResults, ...results],
            jinAlgoResults: [...current.jinAlgoResults, ...newJinResults],
            assignments: { ...current.assignments, ...newSeatAssignments },
            isPreviousView: false,
          },
        });

        return { ok: true, jinCount: newJinResults.length, seatCount: Object.keys(newSeatAssignments).length };
      },

      toggleJin(u: JinUnit) {
        const current = stateRef.current;
        const statuses = deriveJinStatuses(current.jinAlgoResults, current.readyJin);
        const currentStatus = statuses.get(u.jinName) ?? 'unplaced';

        if (currentStatus === 'ready') {
          dispatch({ type: 'TOGGLE_JIN', payload: { readyJin: null, hoverPreview: null } });
          return;
        }

        let jinAlgoResults = current.jinAlgoResults;
        let algoResults = current.algoResults;
        let assignments = current.assignments;

        if (currentStatus === 'placed') {
          const jinResult = jinAlgoResults.find((r) => r.jinName === u.jinName);
          if (jinResult) {
            jinAlgoResults = jinAlgoResults.filter((r) => r.jinName !== u.jinName);
            algoResults = algoResults.filter((r) => r.teamId !== jinResult.syntheticId);
            const nextAssignments = { ...assignments };
            for (const key of jinResult.seatKeys) delete nextAssignments[key];
            assignments = nextAssignments;
          }
        }

        // Setting readyJin to the newly-clicked jin automatically supersedes any previously
        // ready jin — jinStatuses is derived from this single value, so no separate
        // "deactivate the old ready jin" step is needed (unlike the pre-reducer implementation).
        dispatch({
          type: 'TOGGLE_JIN',
          payload: { jinAlgoResults, algoResults, assignments, readyJin: u.jinName, hoverPreview: null },
        });
      },

      // Places the ready jin at the given row. Any placed jins whose seats overlap are
      // silently displaced (their seats freed and status reset to unplaced) — matches the
      // pre-refactor handleRowClick behavior.
      placeJinAtRow(
        jinUnits: JinUnit[],
        sectionId: string,
        rowIdx: number,
        overrides: Record<string, number>,
      ): { feasible: boolean } {
        const current = stateRef.current;
        if (!current.readyJin) return { feasible: false };
        const readyJinName = current.readyJin;
        const jin = jinUnits.find((u) => u.jinName === readyJinName);
        if (!jin) return { feasible: false };

        const [floorId, blockLabel] = sectionId.split('-');
        const result = tryPlaceAtRow(sectionId, floorId as '1F' | '2F', rowIdx, jin.headcount, overrides);
        if (!result.feasible) return { feasible: false };

        const conflictingJinNames = new Set<string>();
        for (const key of result.seatKeys) {
          const existingId = current.assignments[key];
          if (existingId !== undefined) {
            const existingUnit = jinUnits.find((u) => u.syntheticId === existingId);
            if (existingUnit && existingUnit.jinName !== readyJinName) {
              conflictingJinNames.add(existingUnit.jinName);
            }
          }
        }

        const keysToRemove = new Set<string>();
        for (const conflictName of conflictingJinNames) {
          const cr = current.jinAlgoResults.find((r) => r.jinName === conflictName);
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

        const nextAssignments = { ...current.assignments };
        for (const k of keysToRemove) delete nextAssignments[k];
        for (const k of result.seatKeys) nextAssignments[k] = jin.syntheticId;

        const nextJinAlgoResults = [
          ...current.jinAlgoResults.filter(
            (r) => !conflictingJinNames.has(r.jinName) && r.jinName !== readyJinName,
          ),
          newJinResult,
        ];
        const nextAlgoResults = [
          ...current.algoResults.filter((r) => {
            const unit = jinUnits.find((u) => u.syntheticId === r.teamId);
            return !unit || (!conflictingJinNames.has(unit.jinName) && unit.jinName !== readyJinName);
          }),
          newAlgoResult,
        ];

        dispatch({
          type: 'PLACE_JIN',
          payload: {
            assignments: nextAssignments,
            jinAlgoResults: nextJinAlgoResults,
            algoResults: nextAlgoResults,
            readyJin: null,
            hoverPreview: null,
          },
        });
        return { feasible: true };
      },

      previewRow(jinUnits: JinUnit[], sectionId: string, rowIdx: number, overrides: Record<string, number>) {
        const current = stateRef.current;
        if (!current.readyJin) return;
        const jin = jinUnits.find((u) => u.jinName === current.readyJin);
        if (!jin) return;
        const [floorId] = sectionId.split('-');
        const result = tryPlaceAtRow(sectionId, floorId as '1F' | '2F', rowIdx, jin.headcount, overrides);

        dispatch({
          type: 'SET_HOVER',
          payload: {
            hoverPreview: {
              seatKeys: new Set(result.seatKeys),
              feasible: result.feasible,
            },
          },
        });
      },

      clearPreview() {
        if (stateRef.current.readyJin) {
          dispatch({ type: 'CLEAR_PREVIEW', payload: { hoverPreview: null } });
        }
      },

      toggleHighlight(teamId: number) {
        dispatch({
          type: 'HIGHLIGHT',
          payload: { highlightTeamId: stateRef.current.highlightTeamId === teamId ? null : teamId },
        });
      },

      clear(jinUnits: JinUnit[]): { hadSaved: boolean } {
        const { mode: m, assignments: a } = lastSaved.current;
        const payload: Partial<PlacementState> = {
          highlightTeamId: null,
          readyJin: null,
          hoverPreview: null,
          mode: m,
          assignments: { ...a },
          isPreviousView: Object.keys(a).length > 0,
        };

        if (m === 'jin') {
          // Rebuild jinAlgoResults/algoResults from the restored assignments so a subsequent
          // manual placement can find each jin's full seat set when resolving overlaps.
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
          payload.jinAlgoResults = reconstructedJinResults;
          payload.algoResults = reconstructedAlgoResults;
        } else {
          payload.algoResults = [];
          payload.jinAlgoResults = [];
        }

        dispatch({ type: 'CLEAR', payload });
        return { hadSaved: Object.keys(a).length > 0 };
      },

      markSaved(mode: 'team' | 'jin', assignments: Record<string, number>) {
        lastSaved.current = { mode, assignments: { ...assignments } };
      },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { ...state, jinStatuses, actions };
}
