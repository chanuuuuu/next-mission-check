import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { FLOORS } from "../seat-manage/config/seatLayout";
import { MobileFloorView } from "./SeatGrid";

const EMPTY_ASSIGNMENTS: Record<string, number> = {};
const EMPTY_COLOR_MAP = new Map<number, string>();

export default function SeatingLoading() {
  const floor1F = FLOORS.find((f) => f.id === "1F")!;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="border-b border-foreground px-4 py-2 sticky top-0 bg-background z-10">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-tight text-foreground/50 block mb-0.5"
        >
          ← 처음으로
        </Link>
        <h1 className="font-display text-base font-bold tracking-tight">
          내 좌석 찾기
        </h1>
      </header>

      <div className="px-4 py-3 space-y-3">
        {/* 검색창 — 실제 input과 동일한 구조 */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
          <div className="w-full pl-9 pr-9 h-12 border border-foreground bg-background flex items-center">
            <span
              className="h-4 w-40 block rounded-none bg-[size:200%_100%] animate-[var(--animate-shimmer)]"
              style={{ background: 'linear-gradient(90deg, oklch(0.92 0 0) 0%, oklch(0.86 0 0) 50%, oklch(0.92 0 0) 100%)', backgroundSize: '200% 100%' }}
            />
          </div>
        </div>

        {/* 빈 상태 카드 — 검색 전 기본 상태 */}
        <div className="border border-foreground p-3 text-center space-y-1.5">
          <MapPin className="h-5 w-5 mx-auto text-foreground/40" />
          <span
            className="h-3.5 w-48 block mx-auto rounded-none bg-[size:200%_100%] animate-[var(--animate-shimmer)]"
            style={{ background: 'linear-gradient(90deg, oklch(0.92 0 0) 0%, oklch(0.86 0 0) 50%, oklch(0.92 0 0) 100%)', backgroundSize: '200% 100%' }}
          />
        </div>

        {/* 층 탭 + 실제 좌석 구조 */}
        <div>
          <div className="grid grid-cols-2 border border-foreground mb-2">
            <button
              className="font-display font-bold text-sm py-1.5 tracking-wider bg-foreground text-background"
              disabled
            >
              1층
            </button>
            <button
              className="font-display font-bold text-sm py-1.5 tracking-wider bg-background text-foreground border-l border-foreground"
              disabled
            >
              2층
            </button>
          </div>

          <div className="opacity-40 animate-pulse pointer-events-none">
            <MobileFloorView
              floor={floor1F}
              assignments={EMPTY_ASSIGNMENTS}
              highlightTeamId={null}
              teamColorMap={EMPTY_COLOR_MAP}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
