"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Church } from "@/types";

interface Props {
  church: Church;
  phaseCode: string;
}

export function CheckinForm({ church, phaseCode }: Props) {
  const router = useRouter();
  const [allArrived, setAllArrived] = useState(true);
  const [headcount, setHeadcount] = useState("");
  const [breakfastCount, setBreakfastCount] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const isMorning = phaseCode.endsWith("A");
  const phaseLabel = `${phaseCode[0]}일차 ${isMorning ? "오전" : "오후"}`;
  const canSubmit = Number(headcount) >= 1 && Number(breakfastCount) >= 1;

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          church_id: church.id,
          phase_code: phaseCode,
          is_all_arrived: allArrived,
          total_count: Number(headcount),
          breakfast_count: Number(breakfastCount),
          report_notes: note || null,
        }),
      }).then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      }),
    onSuccess: () => setSubmitted(true),
  });

  useEffect(() => {
    if (!submitted) return;
    if (countdown === 0) {
      router.push("/scanner");
      return;
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [submitted, countdown, router]);

  if (submitted) {
    return (
      <div className="min-h-screen w-screen bg-foreground text-background grid grid-cols-[minmax(0,0.8fr)_minmax(520px,1.2fr)]">
        <div className="p-24 flex flex-col justify-between border-r border-background/10">
          <span className="font-display text-[11px] font-bold tracking-[0.3em] uppercase opacity-50">
            셀프 체크인
          </span>
          <div>
            <div className="size-16 bg-brand grid place-items-center font-display text-2xl font-bold mb-10">
              ✓
            </div>
            <h1 className="font-display text-6xl font-bold tracking-tight leading-[0.9] text-balance">
              체크인이
              <br />
              <span className="text-brand">정상 접수</span>되었습니다.
            </h1>
            <p className="mt-8 text-lg opacity-70 max-w-xl">
              오늘도 수고 많으셨습니다.
            </p>
          </div>
          <div className="font-mono text-xs opacity-40">
            {countdown}초 후 스캐너 화면으로 이동합니다
          </div>
        </div>

        <div className="bg-background text-foreground px-24 py-20 flex flex-col justify-center gap-12">
          <p className="font-display text-base tracking-[0.3em] uppercase text-muted-foreground">
            Receipt
          </p>
          <Row label="교회" value={church.name} />
          <Row
            label="도착 여부"
            value={allArrived ? "전원 도착" : "일부 도착"}
          />
          <Row label="저녁 인원" value={`${headcount || 0}명`} />
          <Row label="아침 인원" value={`${breakfastCount || 0}명`} />
          {note && <Row label="추가 사항" value={note} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-background grid grid-cols-[minmax(420px,34vw)_minmax(0,1fr)] animate-[var(--animate-slide-up)] overflow-hidden">
      {/* LEFT — dark panel */}
      <aside className="bg-foreground text-background relative flex flex-col justify-between p-10 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 80px)",
          }}
        />
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/scanner")}
            className="font-display text-md font-bold tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity"
          >
            ← 스캐너로 돌아가기
          </button>
          <span className="font-display text-sm font-bold tracking-[0.3em] uppercase opacity-60">
            셀프 체크인
          </span>
        </div>

        <div className="relative">
          <p className="font-display text-xs tracking-[0.3em] uppercase opacity-50 mb-4">
            CHURCH
          </p>
          <h1 className="font-display text-6xl leading-[1.05] font-bold tracking-tight">
            {church.name}
          </h1>
          <p className="mt-10 text-3xl font-bold leading-snug text-brand">
            {isMorning ? (
              <>오늘도 화이팅입니다!</>
            ) : (
              <>오늘도 너무 고생하셨습니다.</>
            )}
          </p>
          <p className="mt-5 text-base opacity-50 leading-relaxed">
            우측 패널에서 도착 인원 정보를 입력해 주세요.
          </p>
        </div>

        <div className="relative border-t border-background/15 pt-5 font-mono uppercase tracking-wider opacity-70">
          <div className="text-xs opacity-50">Phase</div>
          <div className="mt-1 text-base font-display font-bold opacity-100">
            {phaseLabel}
          </div>
        </div>
      </aside>

      {/* RIGHT — form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col min-h-screen min-w-0"
      >
        <div className="flex-1 px-14 py-12 flex flex-col gap-12 w-full max-w-4xl">
          <div className="space-y-3">
            <FieldLabel
              index="A"
              title="도착 여부"
              hint="전원 도착 시 체크 상태를 유지합니다."
            />
            <button
              type="button"
              onClick={() => setAllArrived(!allArrived)}
              className={`w-full flex items-center justify-between p-5 border-2 transition-colors text-left ${
                allArrived
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-foreground/20 hover:border-foreground/50"
              }`}
            >
              <span className="font-medium text-lg">
                모든 인원이 도착이 완료되었나요?
              </span>
              <span
                className={`size-8 border-2 grid place-items-center font-bold text-base ${
                  allArrived
                    ? "border-brand bg-brand text-white"
                    : "border-foreground/30"
                }`}
              >
                {allArrived ? "✓" : ""}
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <FieldLabel
              index="B"
              title="저녁 식사 인원 수"
              hint="현재 도착 및 개별 도착 예정인 저녁식사 인원 수를 숫자로 입력하세요."
            />
            <div className="flex items-baseline gap-3 border-b-2 border-foreground w-48">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={headcount}
                onChange={(e) =>
                  setHeadcount(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="0"
                autoFocus
                className="flex-1 min-w-0 py-2 text-5xl leading-none font-display font-bold outline-none bg-transparent placeholder:text-muted-foreground/30"
              />
              <span className="font-display text-xl text-muted-foreground pb-2">
                명
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <FieldLabel
              index="C"
              title="내일 아침 식사 인원 수"
              hint="현재 도착 및 개별 도착 예정인 익일 아침식사를 할 인원 수를 숫자로 입력하세요."
            />
            <div className="flex items-baseline gap-3 border-b-2 border-foreground w-48">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={breakfastCount}
                onChange={(e) =>
                  setBreakfastCount(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="0"
                className="flex-1 min-w-0 py-2 text-5xl leading-none font-display font-bold outline-none bg-transparent placeholder:text-muted-foreground/30"
              />
              <span className="font-display text-xl text-muted-foreground pb-2">
                명
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <FieldLabel
              index="D"
              title="추가 보고 사항"
              hint="필요 시 자유롭게 작성해 주세요."
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가적으로 보고가 필요한 사항이 있나요?"
              rows={6}
              className="w-full border border-foreground/20 focus:border-foreground p-4 outline-none resize-none text-base bg-transparent leading-relaxed"
            />
          </div>
        </div>

        <div className="border-t border-foreground bg-background sticky bottom-0">
          {mutation.isError && (
            <p className="px-14 pt-3 text-sm text-destructive font-bold text-center">
              오류가 발생했습니다. 다시 시도해주세요.
            </p>
          )}
          <div className="px-14 py-5">
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="bg-brand text-white w-3/4 py-4 font-display font-bold uppercase tracking-[0.2em] text-sm hover:brightness-110 transition-all disabled:opacity-40"
            >
              {mutation.isPending ? "처리 중..." : "제출 완료 →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-2xl font-bold text-brand">{index}</span>
      <div>
        <div className="font-display text-xl font-bold uppercase tracking-[0.15em]">
          {title}
        </div>
        <div className="text-base text-muted-foreground mt-1">{hint}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4 gap-6">
      <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="font-display font-bold text-3xl text-right truncate">
        {value}
      </span>
    </div>
  );
}
