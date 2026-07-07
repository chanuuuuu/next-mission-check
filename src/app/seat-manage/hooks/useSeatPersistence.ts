import { useState } from "react";
import type { AlgoResult, JinAlgoResult, JinUnit, JinPlacementStatus } from "@/types/seating";
import type { Notice } from "../types";

interface SaveResultsParams {
  mode: 'team' | 'jin';
  assignments: Record<string, number>;
  algoResults: AlgoResult[];
  jinAlgoResults: JinAlgoResult[];
  jinUnits: JinUnit[];
  jinStatuses: Map<string, JinPlacementStatus>;
  onScoreUpdate: (updated: { id: number; accumulated_score: number }[]) => void;
  onSaved: (mode: 'team' | 'jin', assignments: Record<string, number>) => void;
}

export function useSeatPersistence(notify: (n: Notice) => void) {
  const [isSaving, setIsSaving] = useState(false);

  async function saveResults({
    mode,
    assignments,
    algoResults,
    jinAlgoResults,
    jinUnits,
    jinStatuses,
    onScoreUpdate,
    onSaved,
  }: SaveResultsParams) {
    if (mode === 'jin') {
      // All jins must be placed before saving.
      const unplaced = jinUnits.filter(
        (u) => (jinStatuses.get(u.jinName) ?? 'unplaced') !== 'placed',
      );
      if (unplaced.length > 0) {
        notify({
          type: "err",
          msg: `배치 미완료 진: ${unplaced.map((u) => u.jinName).join(', ')}`,
        });
        return;
      }
      if (!jinAlgoResults.length) {
        notify({ type: "err", msg: "배치를 먼저 실행해주세요" });
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
          onSaved('jin', assignments);
          onScoreUpdate(data.teams ?? []);
          notify({ type: "ok", msg: "배치 결과 저장 완료" });
        } else {
          notify({ type: "err", msg: "저장 실패" });
        }
      } catch {
        notify({ type: "err", msg: "네트워크 오류 — 저장되지 않았습니다", retry: true });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!algoResults.length) {
      notify({ type: "err", msg: "먼저 자동 배치를 실행해주세요" });
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
        onSaved('team', assignments);
        onScoreUpdate(data.teams ?? []);
        notify({ type: "ok", msg: "배치 결과 저장 완료" });
      } else {
        notify({ type: "err", msg: "저장 실패" });
      }
    } catch {
      notify({ type: "err", msg: "네트워크 오류 — 저장되지 않았습니다", retry: true });
    } finally {
      setIsSaving(false);
    }
  }

  return { isSaving, saveResults };
}
