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
  onToggleMealCall,
}: Props) {
  const baselineMap = new Map(baselines.map((b) => [b.church_id, b.baseline]));
  const arrivedIds = new Set(checkins.map((c) => c.church_id));

  // 최신 도착이 위로 (내림차순)
  const arrivedSorted = [...checkins].sort(
    (a, b) =>
      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime(),
  );

  // 총인원 = Σ(전체 팀 baseline) - Σ(체크인된 팀 baseline) + 체크인된 팀 실제 저녁인원
  //   → 미체크인 팀은 기준인원(baseline), 체크인 팀은 실제 저녁인원으로 반영한 값.
  //   (스펙: 기준인원→실제인원 swap 은 "체크인" 시점 기준)
  const arrivedDinnerCount = checkins.reduce(
    (sum, c) => sum + (c.total_count ?? 0),
    0,
  );
  const baselineTotal = baselines.reduce((sum, b) => sum + b.baseline, 0);
  const checkedBaseline = baselines.reduce(
    (sum, b) => (arrivedIds.has(b.church_id) ? sum + b.baseline : sum),
    0,
  );
  const totalHeadcount = baselineTotal - checkedBaseline + arrivedDinnerCount;

  // 완료 인원 = "식사호출(meal_called)"이 완료된 팀의 저녁 식사 인원 수 합산
  //   → 잔여 = 아직 식사호출되지 않은(식사 대기) 인원
  const calledDinnerCount = checkins.reduce(
    (sum, c) => (c.meal_called ? sum + (c.total_count ?? 0) : sum),
    0,
  );
  const remaining = totalHeadcount - calledDinnerCount;

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
              {arrivedSorted.length}
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
          {arrivedSorted.map((checkin, i) => {
            const church = churches.find((c) => c.id === checkin.church_id);
            const scope = teamTypeLabel(church?.team_type ?? null);
            const baseline = baselineMap.get(checkin.church_id) ?? 0;
            const called = checkin.meal_called;
            return (
              <div
                key={checkin.id}
                onClick={() =>
                  onToggleMealCall({
                    church_id: checkin.church_id,
                    meal_called: !called,
                  })
                }
                className={`flex items-center gap-3 px-4 py-3 border border-brand/20 cursor-pointer select-none ${
                  called ? "opacity-50 bg-brand/5" : ""
                }`}
              >
                <span className="font-mono text-base font-bold tabular-nums text-brand w-6 flex-shrink-0">
                  {arrivedSorted.length - i}
                </span>
                <span className="text-base font-bold font-display">
                  {church?.name ?? "알 수 없음"}
                </span>
                {scope && (
                  <span className="font-display text-[9px] font-bold tracking-wider uppercase border border-brand/30 text-brand px-1.5 py-0.5 flex-shrink-0">
                    {scope}
                  </span>
                )}
                <span className="ml-auto font-display text-xs font-bold tabular-nums text-muted-foreground whitespace-nowrap">
                  기준 {baseline} · 저녁 {checkin.total_count} · 아침{" "}
                  {checkin.breakfast_count}
                </span>
              </div>
            );
          })}
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
