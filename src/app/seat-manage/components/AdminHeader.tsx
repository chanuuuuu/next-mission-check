import Link from "next/link";
import { Eye } from "lucide-react";

interface AdminHeaderProps {
  isPreviousView: boolean;
  assignedTotal: number;
  totalSeats: number;
  mode: 'team' | 'jin';
  teamsCount: number;
  jinsCount: number;
  totalDemand: number;
}

export default function AdminHeader({
  isPreviousView,
  assignedTotal,
  totalSeats,
  mode,
  teamsCount,
  jinsCount,
  totalDemand,
}: AdminHeaderProps) {
  return (
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
            {mode === 'jin' ? `${jinsCount}진` : `${teamsCount}팀`} · {totalDemand}명
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
  );
}
