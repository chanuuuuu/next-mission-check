"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Home } from "lucide-react";
import { Church, Checkin } from "@/types";
import { PHASE_LABELS, PhaseCode } from "@/types";
import { breakfastSourcePhase } from "@/lib/phase";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBoard, type Baseline } from "./MobileBoard";

interface Props {
  initialChurches: Church[];
  initialCheckins: Checkin[];
  initialPhase: string;
  initialBaselines: Baseline[];
  initialSourceCheckins: Checkin[];
}

export function DashboardClient({
  initialChurches,
  initialCheckins,
  initialPhase,
  initialBaselines,
  initialSourceCheckins,
}: Props) {
  const queryClient = useQueryClient();

  const { data: churches = initialChurches } = useQuery<Church[]>({
    queryKey: ["churches"],
    queryFn: () => fetch("/api/churches").then((r) => r.json()),
    initialData: initialChurches,
  });

  const { data: phaseData } = useQuery<{ phase: string; label: string }>({
    queryKey: ["phase"],
    queryFn: () => fetch("/api/settings/phase").then((r) => r.json()),
    initialData: {
      phase: initialPhase,
      label: PHASE_LABELS[initialPhase as PhaseCode],
    },
  });

  const phase = phaseData?.phase ?? initialPhase;
  const isMorning = phase.endsWith("A");
  const sourcePhase = breakfastSourcePhase(phase); // 아침이면 직전 저녁(P), 아니면 null

  const { data: checkins = initialCheckins } = useQuery<Checkin[]>({
    queryKey: ["checkins", phase],
    queryFn: () => fetch(`/api/checkins?phase=${phase}`).then((r) => r.json()),
    initialData: initialCheckins,
  });

  // 아침 식수 소스 — 직전 저녁(P) phase의 breakfast_count
  const { data: sourceCheckins = initialSourceCheckins } = useQuery<Checkin[]>({
    queryKey: ["checkins", sourcePhase ?? "none"],
    queryFn: () =>
      fetch(`/api/checkins?phase=${sourcePhase}`).then((r) => r.json()),
    initialData: initialSourceCheckins,
    enabled: !!sourcePhase,
  });

  // 팀별 기준인원 — phase 내에서 안정적 (체크인 REFRESH 시 재조회 불필요)
  const { data: baselines = initialBaselines } = useQuery<Baseline[]>({
    queryKey: ["baseline", phase],
    queryFn: () =>
      fetch(`/api/teams/baseline?phase=${phase}`).then((r) => r.json()),
    initialData: initialBaselines,
  });

  useEffect(() => {
    const es = new EventSource("/api/stream/dashboard");
    es.onmessage = (e) => {
      if (e.data === "REFRESH") {
        queryClient.invalidateQueries({ queryKey: ["checkins"] });
        queryClient.invalidateQueries({ queryKey: ["phase"] });
      }
    };
    return () => es.close();
  }, [queryClient]);

  // 아침 식수 맵 / 식사 호출 상태
  const breakfastMap = new Map(
    sourceCheckins.map((c) => [c.church_id, c.breakfast_count]),
  );
  const mealCalledSet = new Set(
    checkins.filter((c) => c.meal_called).map((c) => c.church_id),
  );

  const arrivedIds = new Set(checkins.map((c) => c.church_id));
  // 저녁: 미도착 = 미체크인 교회 / 아침: 미도착 숨김(0)
  const pending = isMorning ? [] : churches.filter((c) => !arrivedIds.has(c.id));

  // 저녁: 최신 도착 위로(내림차순), 순번 1..N(1이 가장 아래)
  const arrivedSorted = [...checkins].sort(
    (a, b) =>
      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime(),
  );

  // 화면에 뿌릴 행 목록 — 모드별로 정규화
  const entries: {
    key: number;
    churchId: number;
    name: string;
    scope: string;
    called: boolean;
    countText: string;
    reportNotes: string | null;
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
            countText: `아침 ${count}`,
            reportNotes: null,
          };
        })
    : arrivedSorted.map((checkin) => {
        const church = churches.find((c) => c.id === checkin.church_id);
        return {
          key: checkin.id,
          churchId: checkin.church_id,
          name: church?.name ?? "알 수 없음",
          scope: teamTypeLabel(church?.team_type ?? null),
          called: checkin.meal_called,
          countText: `저녁 ${checkin.total_count} · 아침 ${checkin.breakfast_count}`,
          reportNotes: checkin.report_notes,
        };
      });

  const arrivedCount = isMorning ? churches.length : arrivedSorted.length;

  // 추가 보고 펼침 상태 (entry.key 기준)
  const [openReports, setOpenReports] = useState<Set<number>>(new Set());
  const toggleReport = (id: number) =>
    setOpenReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 식사 호출 완료 토글 (DB 저장 → SSE로 타 화면 반영)
  const mealCall = useMutation({
    mutationFn: (vars: { church_id: number; meal_called: boolean }) =>
      fetch("/api/checkins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vars, phase_code: phase }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkins"] }),
  });

  const phaseLabel = PHASE_LABELS[phase as PhaseCode] ?? phase;

  // 모바일은 별도 컴포넌트로 렌더 (SSR/첫 렌더는 false → desktop, mount 후 전환)
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileBoard
        churches={churches}
        checkins={checkins}
        phase={phase}
        phaseLabel={phaseLabel}
        baselines={baselines}
        isMorning={isMorning}
        breakfastMap={breakfastMap}
        onToggleMealCall={(vars) => mealCall.mutate(vars)}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* 헤더 */}
      <header className="px-6 md:px-12 py-5 border-b border-foreground flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background flex-shrink-0">
        <div className="flex items-center gap-6">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            체크인 현황판
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              진행률
            </p>
            <p className="font-display text-xl font-bold tabular-nums">
              {arrivedCount} / {churches.length}
            </p>
          </div>
          <span className="bg-brand text-white px-4 py-2 font-display font-bold text-sm tracking-tight">
            {phaseLabel} · {phase}
          </span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 border border-foreground px-3 py-2 font-display text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* 2분할 레이아웃 (아침엔 미도착 숨김 → 도착 완료 전체 폭) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 border-t border-foreground overflow-hidden">
        {/* 좌측 — 미도착 (1/4) — 모바일/아침에서는 숨김 */}
        {!isMorning && (
          <section className="lg:col-span-1 bg-foreground text-background hidden lg:flex flex-col overflow-hidden">
            <div className="px-8 md:px-12 pt-8 pb-4 border-b border-background/20 flex-shrink-0">
              <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-background/50">
                미도착
              </p>
              <p className="text-[clamp(4rem,11vw,10rem)] xl:text-[clamp(4rem,11vw,10rem)] font-bold tracking-tight mt-1 tabular-nums leading-none">
                {pending.length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 md:px-12 py-4 space-y-1">
              {pending.map((church) => (
                <div
                  key={church.id}
                  className="flex justify-between items-center px-4 py-3 border border-background/10 hover:border-background/40 transition-colors"
                >
                  <span className="font-medium opacity-80">{church.name}</span>
                  <span className="font-display text-[10px] tracking-widest text-background/40 font-bold uppercase">
                    미도착
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 우측 — 도착 완료 */}
        <section
          className={`${
            isMorning ? "lg:col-span-4" : "lg:col-span-3"
          } bg-background flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-foreground`}
        >
          <div className="px-8 md:px-12 pt-8 pb-4 border-b border-foreground/20 flex-shrink-0">
            <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-brand">
              도착 완료
            </p>
            <p className="text-[clamp(4rem,11vw,10rem)] xl:text-[clamp(4rem,11vw,10rem)] font-bold tracking-tight mt-1 text-brand tabular-nums leading-none">
              {arrivedCount}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-8 md:px-12 py-4 space-y-1">
            {entries.map((entry, i) => (
              <ArrivedRow
                key={entry.key}
                name={entry.name}
                scope={entry.scope}
                order={isMorning ? i + 1 : entries.length - i}
                countText={entry.countText}
                reportNotes={entry.reportNotes}
                isReportOpen={openReports.has(entry.key)}
                onToggleReport={() => toggleReport(entry.key)}
                called={entry.called}
                onToggleMealCall={() =>
                  mealCall.mutate({
                    church_id: entry.churchId,
                    meal_called: !entry.called,
                  })
                }
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function teamTypeLabel(t: string | null): string {
  if (t === "YOUTH") return "2청";
  if (t === "ADULT") return "청장년";
  return "";
}

function ArrivedRow({
  name,
  scope,
  order,
  countText,
  reportNotes,
  isReportOpen,
  onToggleReport,
  called,
  onToggleMealCall,
}: {
  name: string;
  scope: string;
  order: number;
  countText: string;
  reportNotes: string | null;
  isReportOpen: boolean;
  onToggleReport: () => void;
  called: boolean;
  onToggleMealCall: () => void;
}) {
  const hasReport = !!reportNotes?.trim();

  return (
    <div className="border border-brand/20 hover:border-brand/40 transition-colors">
      {/* 행 클릭 → 식사 호출 완료 토글 */}
      <div
        onClick={onToggleMealCall}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${
          called ? "opacity-50 bg-brand/5" : ""
        }`}
      >
        <span className="font-mono text-base lg:text-lg font-bold tabular-nums text-brand w-6 lg:w-7 flex-shrink-0">
          {order}
        </span>
        <span className="text-base lg:text-lg font-bold font-display">
          {name}
        </span>
        {scope && (
          <span className="font-display text-[9px] lg:text-[15px] font-bold tracking-wider uppercase border border-brand/30 text-brand px-1.5 py-0.5 flex-shrink-0">
            {scope}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2 lg:gap-4">
          {hasReport && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReport();
              }}
              className={`font-display text-[10px] font-bold tracking-widest uppercase border px-2 py-1 transition-colors flex-shrink-0 ${
                isReportOpen
                  ? "border-brand bg-brand text-white"
                  : "border-foreground/30 text-muted-foreground hover:border-foreground"
              }`}
            >
              보고 {isReportOpen ? "▲" : "▼"}
            </button>
          )}
          {called && (
            <span className="font-display text-[10px] font-bold tracking-widest uppercase text-brand">
              식사 호출 완료
            </span>
          )}
          <span className="font-display text-xs lg:text-md font-bold tabular-nums text-muted-foreground whitespace-nowrap">
            {countText}
          </span>
        </span>
      </div>

      {/* 추가 보고 사항 slide 확장 */}
      {hasReport && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`grid transition-[grid-template-rows] duration-300 ${
            isReportOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <p className="px-4 py-3 border-t border-brand/20 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {reportNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
