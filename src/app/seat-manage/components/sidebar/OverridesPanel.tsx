import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverridesPanelProps {
  overrides: Record<string, number>;
  showOverrides: boolean;
  onToggleShow: () => void;
  newKey: string;
  setNewKey: (v: string) => void;
  newDelta: string;
  setNewDelta: (v: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}

export default function OverridesPanel({
  overrides,
  showOverrides,
  onToggleShow,
  newKey,
  setNewKey,
  newDelta,
  setNewDelta,
  onAdd,
  onRemove,
}: OverridesPanelProps) {
  return (
    <div className="border-t border-foreground pt-5">
      <button
        onClick={onToggleShow}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/50 flex items-center gap-1.5">
          <Settings2 className="h-3 w-3" />
          점수 보정 설정
          {Object.keys(overrides).length > 0 && (
            <span className="bg-foreground text-background px-1 font-mono">
              {Object.keys(overrides).length}
            </span>
          )}
        </span>
        <span className="text-[9px] font-display text-foreground/40">
          {showOverrides ? "▲" : "▼"}
        </span>
      </button>

      {showOverrides && (
        <div className="space-y-2">
          <p className="text-[10px] text-foreground/50 leading-relaxed border border-foreground/20 p-2 font-mono">
            키 형식: <strong>1F_C_R3_C6</strong>
            <br />
            보정값: 양수(+점수) / 음수(−점수)
            <br />
            배치 실행 시 earnedScore에 반영됨
          </p>

          {Object.entries(overrides).length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(overrides).map(([key, delta]) => (
                <div key={key} className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="flex-1 truncate text-foreground/70">{key}</span>
                  <span
                    className={cn(
                      "w-10 text-right tabular-nums font-bold shrink-0",
                      delta > 0 ? "text-foreground" : "text-foreground/50",
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                  <button
                    onClick={() => onRemove(key)}
                    className="shrink-0 text-foreground/30 hover:text-foreground ml-1"
                    aria-label="삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1 pt-0.5">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              placeholder="1F_C_R3_C6"
              className="flex-1 h-6 px-1.5 text-[10px] font-mono border border-foreground/40 bg-background focus:outline-none focus:border-foreground min-w-0"
            />
            <input
              type="number"
              value={newDelta}
              onChange={(e) => setNewDelta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              placeholder="±"
              className="w-10 h-6 px-1 text-[10px] font-mono border border-foreground/40 bg-background focus:outline-none focus:border-foreground text-right shrink-0"
            />
            <button
              onClick={onAdd}
              className="h-6 px-2 text-[10px] font-display font-bold border border-foreground hover:bg-foreground hover:text-background transition-colors shrink-0"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
