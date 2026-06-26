import { cn } from '@/lib/utils'
import { FLOORS } from '../../seat-manage/config/seatLayout'
import { MobileFloorView } from '../SeatGrid'
import type { FloorTab } from '@/types/seating'

interface Props {
  floorTab: FloorTab
  onTabChange: (f: FloorTab) => void
  assignments: Record<string, number>
  highlightTeamId: number | null
  teamColorMap: Map<number, string>
}

export function FloorTabView({
  floorTab,
  onTabChange,
  assignments,
  highlightTeamId,
  teamColorMap,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 border border-foreground mb-4">
        {(['1F', '2F'] as FloorTab[]).map((f) => (
          <button
            key={f}
            onClick={() => onTabChange(f)}
            className={cn(
              'font-display font-bold text-sm py-2 tracking-wider transition-colors',
              floorTab === f
                ? 'bg-foreground text-background'
                : 'bg-background text-foreground hover:bg-foreground/10',
              f === '2F' && 'border-l border-foreground',
            )}
          >
            {f === '1F' ? '1층' : '2층'}
          </button>
        ))}
      </div>

      {FLOORS.filter((floor) => floor.id === floorTab).map((floor) => (
        <MobileFloorView
          key={floor.id}
          floor={floor}
          assignments={assignments}
          highlightTeamId={highlightTeamId}
          teamColorMap={teamColorMap}
        />
      ))}
    </div>
  )
}
