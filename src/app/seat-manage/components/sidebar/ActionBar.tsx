import { Play, RotateCcw, Save } from "lucide-react";

interface ActionBarProps {
  onRun: () => void;
  onClear: () => void;
  onSave: () => void;
  clearDisabled: boolean;
  saveDisabled: boolean;
  isSaving: boolean;
}

export default function ActionBar({ onRun, onClear, onSave, clearDisabled, saveDisabled, isSaving }: ActionBarProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onRun}
        className="w-full flex items-center gap-2 justify-center bg-foreground text-background font-display font-bold text-sm px-4 py-2.5 hover:opacity-80 transition-opacity"
      >
        <Play className="h-4 w-4" />
        자동 배치 실행
      </button>
      <button
        onClick={onClear}
        disabled={clearDisabled}
        className="w-full flex items-center gap-2 justify-center border border-foreground font-display font-bold text-sm px-4 py-2.5 hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <RotateCcw className="h-4 w-4" />
        배치 초기화
      </button>
      <button
        onClick={onSave}
        disabled={saveDisabled}
        className="w-full flex items-center gap-2 justify-center border border-foreground font-display font-bold text-sm px-4 py-2.5 hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "저장 중..." : "배치 결과 저장"}
      </button>
    </div>
  );
}
