"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Church, Checkin } from "@/types";
import { PHASE_LABELS, PhaseCode } from "@/types";

interface Props {
  initialChurches: Church[];
  initialCheckins: Checkin[];
  initialPhase: string;
}

export function DashboardClient({
  initialChurches,
  initialCheckins,
  initialPhase,
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

  const { data: checkins = initialCheckins } = useQuery<Checkin[]>({
    queryKey: ["checkins", phase],
    queryFn: () => fetch(`/api/checkins?phase=${phase}`).then((r) => r.json()),
    initialData: initialCheckins,
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

  const arrivedIds = new Set(checkins.map((c) => c.church_id));
  const pending = churches.filter((c) => !arrivedIds.has(c.id));

  // 최신 도착이 위로 오도록 내림차순 정렬 — 순번은 1..N 유지(1번이 가장 아래)
  const arrivedSorted = [...checkins].sort(
    (a, b) =>
      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime(),
  );

  // 추가 보고 펼침 상태 (checkin.id 기준)
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["checkins"] }),
  });

  const phaseLabel = PHASE_LABELS[phase as PhaseCode] ?? phase;

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
              {arrivedSorted.length} / {churches.length}
            </p>
          </div>
          <span className="bg-brand text-white px-4 py-2 font-display font-bold text-sm tracking-tight">
            {phaseLabel} · {phase}
          </span>
        </div>
      </header>

      {/* 2분할 레이아웃 */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 border-t border-foreground overflow-hidden">
        {/* 좌측 — 미도착 (1/4) */}
        <section className="lg:col-span-1 bg-foreground text-background flex flex-col overflow-hidden">
          <div className="px-8 md:px-12 pt-8 pb-4 border-b border-background/20 flex-shrink-0">
            <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-background/50">
              미도착
            </p>
            <p className="text-[clamp(4rem,11vw,10rem)] xl:text-[clamp(4rem,11vw,10rem)] font-bold tracking-tight mt-1 tabular-nums leading-none">
              {pending.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-8 md:px-12 py-4 space-y-1">
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

        {/* 우측 — 도착 완료 (3/4) */}
        <section className="lg:col-span-3 bg-background flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-foreground">
          <div className="px-8 md:px-12 pt-8 pb-4 border-b border-foreground/20 flex-shrink-0">
            <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-brand">
              도착 완료
            </p>
            <p className="text-[clamp(4rem,11vw,10rem)] xl:text-[clamp(4rem,11vw,10rem)] font-bold tracking-tight mt-1 text-brand tabular-nums leading-none">
              {arrivedSorted.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-8 md:px-12 py-4 space-y-1">
            {arrivedSorted.map((checkin, i) => {
              const church = churches.find((c) => c.id === checkin.church_id);
              return (
                <ArrivedRow
                  key={checkin.id}
                  checkin={checkin}
                  church={church}
                  order={arrivedSorted.length - i}
                  isReportOpen={openReports.has(checkin.id)}
                  onToggleReport={() => toggleReport(checkin.id)}
                  called={checkin.meal_called}
                  onToggleMealCall={() =>
                    mealCall.mutate({
                      church_id: checkin.church_id,
                      meal_called: !checkin.meal_called,
                    })
                  }
                />
              );
            })}
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
  checkin,
  church,
  order,
  isReportOpen,
  onToggleReport,
  called,
  onToggleMealCall,
}: {
  checkin: Checkin;
  church?: Church;
  order: number;
  isReportOpen: boolean;
  onToggleReport: () => void;
  called: boolean;
  onToggleMealCall: () => void;
}) {
  const hasReport = !!checkin.report_notes?.trim();
  const scope = teamTypeLabel(church?.team_type ?? null);

  return (
    <div className="border border-brand/20 hover:border-brand/40 transition-colors">
      {/* 행 클릭 → 식사 호출 완료 토글 */}
      <div
        onClick={onToggleMealCall}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${
          called ? "opacity-50 bg-brand/5" : ""
        }`}
      >
        <span className="font-mono text-lg font-bold tabular-nums text-brand w-7 flex-shrink-0">
          {order}
        </span>
        <span className="text-lg font-bold font-display">
          {church?.name ?? "알 수 없음"}
        </span>
        {scope && (
          <span className="font-display text-[15px] font-bold tracking-wider uppercase border border-brand/30 text-brand px-1.5 py-0.5 flex-shrink-0">
            {scope}
          </span>
        )}

        <span className="ml-auto flex items-center gap-4">
          {called && (
            <span className="font-display text-[10px] font-bold tracking-widest uppercase text-brand">
              식사 호출 완료
            </span>
          )}
          <span className="font-display text-md font-bold tabular-nums text-muted-foreground whitespace-nowrap">
            저녁 {checkin.total_count} · 아침 {checkin.breakfast_count}
          </span>
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
              {checkin.report_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
