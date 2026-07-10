"use client";

import { useEffect, useRef, useState } from "react";
import { Church, Checkin } from "@/types";

export interface Baseline {
  church_id: number;
  baseline: number;
}

interface Props {
  churches: Church[];
  checkins: Checkin[];
  phase: string;
  phaseLabel: string;
  baselines: Baseline[];
  isMorning: boolean;
  breakfastMap: Map<number, number>;
  onToggleMealCall: (vars: { church_id: number; meal_called: boolean }) => void;
}

function teamTypeLabel(t: string | null): string {
  if (t === "YOUTH") return "2청";
  if (t === "ADULT") return "청장년";
  return "";
}

interface ToastItem {
  key: number;
  name: string;
}

export function MobileBoard({
  churches,
  checkins,
  phase,
  phaseLabel,
  baselines,
  isMorning,
  breakfastMap,
  onToggleMealCall,
}: Props) {
  const baselineMap = new Map(baselines.map((b) => [b.church_id, b.baseline]));
  const arrivedIds = new Set(checkins.map((c) => c.church_id));
  const mealCalledSet = new Set(
    checkins.filter((c) => c.meal_called).map((c) => c.church_id),
  );

  // 화면에 뿌릴 행 목록 — 모드별 정규화
  const rows: {
    key: number;
    churchId: number;
    name: string;
    scope: string;
    called: boolean;
    count: number;
    countText: string;
  }[] = isMorning
    ? [...churches]
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map((church) => {
          const count = breakfastMap.get(church.id) ?? 0;
          return {
            key: church.id,
            churchId: church.id,
            name: church.name,
            scope: teamTypeLabel(church.team_type),
            called: mealCalledSet.has(church.id),
            count,
            countText: `아침 ${count}`,
          };
        })
    : [...checkins]
        .sort(
          (a, b) =>
            new Date(b.checked_in_at).getTime() -
            new Date(a.checked_in_at).getTime(),
        )
        .map((checkin) => {
          const church = churches.find((c) => c.id === checkin.church_id);
          const baseline = baselineMap.get(checkin.church_id) ?? 0;
          return {
            key: checkin.id,
            churchId: checkin.church_id,
            name: church?.name ?? "알 수 없음",
            scope: teamTypeLabel(church?.team_type ?? null),
            called: checkin.meal_called,
            count: checkin.total_count,
            countText: `기준 ${baseline} · 저녁 ${checkin.total_count} · 아침 ${checkin.breakfast_count}`,
          };
        });

  const arrivedCount = isMorning ? churches.length : arrivedIds.size;

  let totalHeadcount: number;
  if (isMorning) {
    // 아침: 총인원 = Σ(전 교회 아침 식수 = 직전 저녁 breakfast_count)
    totalHeadcount = churches.reduce(
      (sum, c) => sum + (breakfastMap.get(c.id) ?? 0),
      0,
    );
  } else {
    // 저녁: Σ(전체 baseline) - Σ(체크인 팀 baseline) + Σ(체크인 팀 실제 저녁인원)
    const arrivedDinnerCount = checkins.reduce(
      (sum, c) => sum + (c.total_count ?? 0),
      0,
    );
    const baselineTotal = baselines.reduce((sum, b) => sum + b.baseline, 0);
    const checkedBaseline = baselines.reduce(
      (sum, b) => (arrivedIds.has(b.church_id) ? sum + b.baseline : sum),
      0,
    );
    totalHeadcount = baselineTotal - checkedBaseline + arrivedDinnerCount;
  }

  // 완료 인원 = 식사 호출된 행의 식수 합 → 잔여 = 총인원 - 완료
  const calledCount = rows.reduce(
    (sum, r) => (r.called ? sum + r.count : sum),
    0,
  );
  const remaining = totalHeadcount - calledCount;

  // 식사 호출 토스트 — meal_called false→true 전이 감지
  const prevCalledRef = useRef<Set<number> | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastKeyRef = useRef(0);

  useEffect(() => {
    const current = new Set(
      checkins.filter((c) => c.meal_called).map((c) => c.church_id),
    );
    const prev = prevCalledRef.current;

    // 첫 렌더는 baseline만 세팅 (기존 호출은 토스트 X)
    if (prev === null) {
      prevCalledRef.current = current;
      return;
    }

    const newlyCalled = [...current].filter((id) => !prev.has(id));
    if (newlyCalled.length > 0) {
      const items: ToastItem[] = newlyCalled.map((id) => {
        const name = churches.find((c) => c.id === id)?.name ?? "알 수 없음";
        return { key: ++toastKeyRef.current, name };
      });
      setToasts((prevToasts) => [...prevToasts, ...items]);
      // ~1초 후 제거
      items.forEach((item) => {
        setTimeout(() => {
          setToasts((prevToasts) => prevToasts.filter((t) => t.key !== item.key));
        }, 1000);
      });
    }

    prevCalledRef.current = current;
  }, [checkins, churches]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* 헤더 — {phaseLabel} · {phase} 만 노출 */}
      <header className="px-6 py-5 border-b border-foreground flex items-center bg-background flex-shrink-0">
        <span className="bg-brand text-white px-4 py-2 font-display font-bold text-sm tracking-tight">
          {phaseLabel} · {phase}
        </span>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden border-t border-foreground">
        {/* 도착 완료 헤더 + 우측 총인원 */}
        <div className="px-8 pt-8 pb-4 border-b border-foreground/20 flex-shrink-0 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-brand">
              도착 완료
            </p>
            <p className="text-[clamp(4rem,18vw,8rem)] font-bold tracking-tight mt-1 text-brand tabular-nums leading-none">
              {arrivedCount}
            </p>
          </div>
          <div className="text-right pb-2">
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              잔여 / 총인원
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {remaining} / {totalHeadcount}
            </p>
          </div>
        </div>

        {/* 도착 완료 리스트 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {rows.map((row, i) => (
            <div
              key={row.key}
              onClick={() =>
                onToggleMealCall({
                  church_id: row.churchId,
                  meal_called: !row.called,
                })
              }
              className={`flex items-center gap-3 px-4 py-3 border border-brand/20 cursor-pointer select-none ${
                row.called ? "opacity-50 bg-brand/5" : ""
              }`}
            >
              <span className="font-mono text-base font-bold tabular-nums text-brand w-6 flex-shrink-0">
                {isMorning ? i + 1 : rows.length - i}
              </span>
              <span className="text-base font-bold font-display">
                {row.name}
              </span>
              {row.scope && (
                <span className="font-display text-[9px] font-bold tracking-wider uppercase border border-brand/30 text-brand px-1.5 py-0.5 flex-shrink-0">
                  {row.scope}
                </span>
              )}
              <span className="ml-auto font-display text-xs font-bold tabular-nums text-muted-foreground whitespace-nowrap">
                {row.countText}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* 식사 호출 토스트 (하단 고정, ~1초) */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-2 px-6 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.key}
              className="bg-brand text-white px-5 py-3 font-display font-bold text-sm tracking-tight shadow-lg animate-[var(--animate-slide-up)]"
            >
              {t.name} 식사호출
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
