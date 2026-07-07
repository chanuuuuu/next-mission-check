import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: 'team' | 'jin';
  onSwitch: (mode: 'team' | 'jin') => void;
}

export default function ModeToggle({ mode, onSwitch }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 border border-foreground">
      <button
        onClick={() => onSwitch('team')}
        disabled
        title="팀별 배치 기능은 비활성화되었습니다"
        className={cn(
          "font-display font-bold text-xs py-2 tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
          mode === 'team' ? "bg-foreground text-background" : "hover:bg-foreground/10",
        )}
      >
        팀별
      </button>
      <button
        onClick={() => onSwitch('jin')}
        className={cn(
          "font-display font-bold text-xs py-2 tracking-wider transition-colors border-l border-foreground",
          mode === 'jin' ? "bg-foreground text-background" : "hover:bg-foreground/10",
        )}
      >
        진별
      </button>
    </div>
  );
}
