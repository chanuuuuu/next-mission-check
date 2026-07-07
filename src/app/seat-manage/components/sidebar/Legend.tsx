import { CheckCircle2, Circle } from "lucide-react";

interface LegendProps {
  mode: 'team' | 'jin';
}

export default function Legend({ mode }: LegendProps) {
  return (
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
  );
}
